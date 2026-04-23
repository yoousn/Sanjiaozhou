import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import requests

TARGET_UIDS = {
    "52717408": "Always聪聪",
    "5995562": "初水改枪",
    "2025603": "C8_saber",
}

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"
OUTPUT_FILE = SCRIPTS_DIR / "bilibili_latest_videos.json"
AI_OUTPUT_FILE = SCRIPTS_DIR / "bilibili_ai_builds_test.json"
COOKIES_FILE = SCRIPTS_DIR / "cookies.txt"
HEADER_STRING_FILES = sorted(SCRIPTS_DIR.glob("*header_string*.txt"))
AI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.yousn.me/v1")
AI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-88AqJeSQhfrmVTDcSAOTZDb6NqEbG3X8C3na3WqolNdasdpb")
DEFAULT_AI_MODEL = os.getenv("OPENAI_MODEL", "openai/gpt-oss-120b")
WRITE_DEBUG_FILES = os.getenv("COLLECT_WRITE_DEBUG_FILES", "false").lower() == "true"
DEFAULT_TARGET_GUNS = ["M14", "M250"]
ALLOWED_MODES = ["search", "preview", "test-model", "auto"]
CATEGORY_VALUES = {"ar", "smg", "sr", "dmr", "sg", "lmg", "pistol", "other"}
YT_DLP_SOCKET_TIMEOUT = "45"
LOG_PREFIX = "__COLLECT_LOG__"


def split_csv(value: str | None) -> list[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def load_cookie_args() -> tuple[list[str], str]:
    if COOKIES_FILE.exists():
        return ["--cookies", str(COOKIES_FILE)], f"cookies.txt: {COOKIES_FILE}"

    for header_file in HEADER_STRING_FILES:
        raw = header_file.read_text(encoding="utf-8").strip()
        if raw:
            return ["--add-header", f"Cookie: {raw}"], f"header string: {header_file}"

    return [], "none"


def build_search_log(message: str, stage: str, *, creator_id: str = "", creator_name: str = "", video_id: str = "") -> dict:
    return {
        "timestamp": int(time.time() * 1000),
        "stage": stage,
        "creatorId": creator_id,
        "creatorName": creator_name,
        "videoId": video_id,
        "message": message,
    }


def emit_progress_log(log: dict) -> None:
    try:
        sys.stderr.write(f"{LOG_PREFIX}{json.dumps(log, ensure_ascii=False)}\n")
        sys.stderr.flush()
    except Exception:
        pass


def append_search_log(logs: list[dict], message: str, stage: str, *, creator_id: str = "", creator_name: str = "", video_id: str = "") -> None:
    log = build_search_log(message, stage, creator_id=creator_id, creator_name=creator_name, video_id=video_id)
    logs.append(log)
    emit_progress_log(log)


def run_yt_dlp(url: str, flat_playlist: bool = False):
    cookie_args, _ = load_cookie_args()
    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--dump-single-json",
        "--socket-timeout",
        YT_DLP_SOCKET_TIMEOUT,
        "--retries", "3",
        "--no-check-certificate",
        "--add-header", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "--add-header", "Referer: https://www.bilibili.com"
    ]
    if flat_playlist:
        cmd.extend(["--flat-playlist", "--playlist-end", "12"])
    cmd.extend([
        *cookie_args,
        url,
    ])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "yt-dlp failed")
    return json.loads(result.stdout)


def fetch_video_detail(bvid: str) -> dict:
    return run_yt_dlp(f"https://www.bilibili.com/video/{bvid}")


def extract_bvid(url: str) -> str:
    match = re.search(r"(BV[a-zA-Z0-9]+)", url or "")
    return match.group(1) if match else ""


def normalize_entry(entry: dict, author_name: str) -> dict:
    webpage_url = entry.get("webpage_url") or entry.get("url") or ""
    description = entry.get("description") or ""
    return {
        "id": entry.get("id") or extract_bvid(webpage_url),
        "bvid": extract_bvid(webpage_url) or entry.get("id") or "",
        "title": entry.get("title") or "",
        "description": description,
        "url": webpage_url,
        "timestamp": entry.get("timestamp"),
        "upload_date": entry.get("upload_date"),
        "uploader": entry.get("uploader") or author_name,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=ALLOWED_MODES, default="search")
    parser.add_argument("--guns", default=",".join(DEFAULT_TARGET_GUNS))
    parser.add_argument("--creator-ids", default=",".join(TARGET_UIDS.keys()))
    parser.add_argument("--video-ids", default="")
    parser.add_argument("--videos-json", default="")
    parser.add_argument("--model", default=DEFAULT_AI_MODEL)
    parser.add_argument("--max-videos", type=int, default=5)
    parser.add_argument("--base-url", default=AI_BASE_URL)
    parser.add_argument("--api-key", default=AI_API_KEY)
    parser.add_argument("--concurrent", default="false")
    return parser.parse_args()


def normalize_gun_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "", (name or "").upper())


def format_upload_date(upload_date: str) -> str:
    raw = str(upload_date or "")
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def video_matches_guns(video: dict, target_guns: list[str]) -> list[str]:
    normalized_targets = [(gun, normalize_gun_name(gun)) for gun in target_guns if gun.strip()]
    matched_in: set[str] = set()
    title_text = normalize_gun_name(video.get("title") or "")
    description_text = normalize_gun_name(video.get("description") or "")

    for _, normalized_gun in normalized_targets:
        if not normalized_gun:
            continue
        if normalized_gun in title_text:
            matched_in.add("title")
        if normalized_gun in description_text:
            matched_in.add("description")

    return [field for field in ["title", "description"] if field in matched_in]


def build_search_video(video: dict, matched_in: list[str]) -> dict:
    return {
        "id": video.get("bvid") or video.get("id") or "",
        "bvid": video.get("bvid") or "",
        "title": video.get("title") or "",
        "description": video.get("description") or "",
        "author": video.get("uploader") or "",
        "uploadDate": format_upload_date(video.get("upload_date") or ""),
        "url": video.get("url") or "",
        "matchedIn": matched_in,
    }


def build_prompt(video: dict) -> str:
    return f"""
你是一个“三角洲行动改枪码提取器”。
请只根据下面的视频标题和视频简介，提取所有明确出现的改枪配置。

提取规则：
1. 只提取文本里明确出现的枪名、改法名、价格、评级、改枪码。
2. 改枪码通常是类似 `35-6JPJJF80B0GKDDOTE9T6Q`、`A-6JP8V18049H3TLFDHMKHO` 这样的可复制字符串。
3. 同一把枪可以有多个配置，每个配置单独返回一条。
4. 不要编造不存在的信息；没有就留空字符串。
5. category 只能从这些值里选一个：ar, smg, sr, dmr, sg, lmg, pistol, other。
6. “price”字段请精准提取金额数字（如“23万”、“35W”），“tier”字段请精准提取评级（如 SSS, SS, S, A, B, C, D 或是 T0, T1, T2, T3）。若无则留空。
7. 返回内容必须是 JSON 数组，不要 markdown，不要解释。

视频标题：
{video.get('title', '')}

视频简介：
{video.get('description', '')}

返回格式：
[
  {{
    "gunName": "M4A1",
    "category": "ar",
    "tier": "S",
    "price": "35万",
    "buildType": "高改暗杀版",
    "code": "35-6JPJJF80B0GKDDOTE9T6Q"
  }}
]
""".strip()


def call_ai(prompt: str, model: str, base_url: str, api_key: str, timeout: int = 120) -> str:
    url = f"{base_url.rstrip('/')}/chat/completions"
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                },
                timeout=timeout,
            )
        except Exception as exc:
            if attempt < max_retries - 1:
                time.sleep(3)
                continue
            raise RuntimeError(f"网络请求错误: {exc}")

        if not response.ok:
            if response.status_code in [502, 503, 504] and attempt < max_retries - 1:
                time.sleep(3)
                continue
            raise RuntimeError(f"接口请求失败 (HTTP {response.status_code}): {response.text}")
        
        break

    try:
        payload = response.json()
    except Exception as exc:
        raise RuntimeError(f"解析 JSON 响应失败，接口地址可能不正确。返回内容为: {response.text[:200]}") from exc

    error_msg = payload.get("error")
    if error_msg:
        raise RuntimeError(f"API 返回错误: {error_msg}")

    return payload.get("choices", [{}])[0].get("message", {}).get("content", "") or ""


def parse_ai_json_array(text: str) -> list[dict]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        match = re.search(r"\[[\s\S]*\]", cleaned)
        if not match:
            return []
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, list) else []


def normalize_variant(item: dict, video: dict) -> dict | None:
    code = str(item.get("code") or "").strip()
    gun_name = str(item.get("gunName") or "").strip()
    if not code or not gun_name:
        return None

    category = str(item.get("category") or "other").strip().lower() or "other"
    if category not in CATEGORY_VALUES:
        category = "other"

    return {
        "gunName": gun_name,
        "normalizedGunName": normalize_gun_name(gun_name),
        "category": category,
        "variant": {
            "id": f"v_{int(time.time() * 1000)}_{abs(hash((gun_name, code, video.get('bvid')))) % 100000}",
            "tier": str(item.get("tier") or "").strip(),
            "price": str(item.get("price") or "").strip(),
            "buildType": str(item.get("buildType") or "").strip(),
            "code": code,
            "date": format_upload_date(video.get("upload_date") or video.get("uploadDate") or ""),
            "author": video.get("uploader") or video.get("author") or "",
            "sourceUrl": video.get("url") or "",
            "locked": False,
        },
    }


def build_groups_from_videos(videos: list[dict], target_guns: list[str], model: str, base_url: str, api_key: str, concurrent: bool) -> tuple[list[dict], list[dict], list[str]]:
    groups_by_name: dict[str, dict] = {}
    extraction_logs: list[dict] = []
    errors: list[str] = []
    normalized_targets = {normalize_gun_name(gun) for gun in target_guns if gun.strip()}

    for video in videos:
        try:
            raw_text = call_ai(build_prompt(video), model, base_url, api_key)
            parsed_items = parse_ai_json_array(raw_text)
            extraction_logs.append({
                "bvid": video.get("bvid"),
                "title": video.get("title"),
                "raw": raw_text,
                "parsed": parsed_items,
            })

            for item in parsed_items:
                normalized = normalize_variant(item, video)
                if not normalized:
                    continue
                if normalized_targets and normalized["normalizedGunName"] not in normalized_targets:
                    continue

                gun_name = normalized["gunName"]
                variant = normalized["variant"]
                if gun_name not in groups_by_name:
                    groups_by_name[gun_name] = {
                        "id": f"g_{len(groups_by_name) + 1}_{abs(hash(gun_name)) % 100000}",
                        "name": gun_name,
                        "category": normalized["category"],
                        "variants": [],
                    }

                group = groups_by_name[gun_name]
                if any(existing.get("code") == variant["code"] for existing in group["variants"]):
                    continue
                group["variants"].append(variant)
        except Exception as exc:
            errors.append(f"{video.get('title') or video.get('bvid') or '未知视频'}: {exc}")

    result_groups = []
    for group in groups_by_name.values():
        group["variants"] = group["variants"][:5]
        result_groups.append(group)

    return result_groups, extraction_logs, errors


def fetch_creator_videos(creator_ids: list[str], max_videos: int, concurrent: bool) -> tuple[list[dict], list[dict], str, list[dict]]:
    collected_sources = []
    errors = []
    _, cookie_source = load_cookie_args()
    logs: list[dict] = []
    append_search_log(logs, f"Cookie 来源：{cookie_source}", "config")

    for uid in creator_ids:
        author_name = TARGET_UIDS.get(uid, uid)
        url = f"https://space.bilibili.com/{uid}/video"
        append_search_log(logs, f"开始抓取博主 {author_name}（{uid}）的视频列表", "creator-start", creator_id=uid, creator_name=author_name)
        try:
            payload = run_yt_dlp(url, flat_playlist=True)
            entries = payload.get("entries") or []
            append_search_log(logs, f"博主 {author_name} 的列表抓取成功，共拿到 {len(entries)} 条候选视频", "creator-playlist", creator_id=uid, creator_name=author_name)
            normalized = []
            for index, entry in enumerate(entries[:max_videos], start=1):
                bvid = entry.get("id") or extract_bvid(entry.get("url") or entry.get("webpage_url") or "")
                if not bvid:
                    append_search_log(logs, f"第 {index} 条候选视频缺少 BV 号，已跳过", "video-skip", creator_id=uid, creator_name=author_name)
                    continue
                append_search_log(logs, f"正在抓取视频详情：{bvid}（第 {index}/{min(len(entries), max_videos)} 条）", "video-detail", creator_id=uid, creator_name=author_name, video_id=bvid)
                detail = fetch_video_detail(bvid)
                normalized.append(normalize_entry(detail, author_name))
            collected_sources.append({
                "uid": uid,
                "author": author_name,
                "videos": normalized,
            })
            append_search_log(logs, f"博主 {author_name} 详情抓取完成，成功保留 {len(normalized)} 条视频", "creator-complete", creator_id=uid, creator_name=author_name)
        except Exception as exc:
            error_message = str(exc)
            errors.append({
                "uid": uid,
                "author": author_name,
                "error": error_message,
            })
            append_search_log(logs, f"博主 {author_name} 抓取失败：{error_message}", "creator-error", creator_id=uid, creator_name=author_name)

    return collected_sources, errors, cookie_source, logs


def search_mode(target_guns: list[str], creator_ids: list[str], max_videos: int, concurrent: bool) -> dict:
    sources, errors, cookie_source, logs = fetch_creator_videos(creator_ids, max_videos, concurrent)
    videos = []
    seen_video_ids = set()

    for source in sources:
        for video in source.get("videos", []):
            matched_in = video_matches_guns(video, target_guns)
            video_id = video.get("bvid") or video.get("id") or ""
            if not matched_in or not video_id or video_id in seen_video_ids:
                continue
            seen_video_ids.add(video_id)
            videos.append(build_search_video(video, matched_in))
            append_search_log(logs, f"命中视频：{video.get('title') or video_id}", "video-match", creator_id=str(source.get('uid') or ""), creator_name=str(source.get('author') or ""), video_id=video_id)

    result = {
        "success": len(videos) > 0 and len(errors) == 0,
        "partial_success": len(videos) > 0 and len(errors) > 0,
        "cookie_source": cookie_source,
        "using_cookies": cookie_source != "none",
        "cookies_file": str(COOKIES_FILE),
        "guns": target_guns,
        "creatorIds": creator_ids,
        "creators": [{"id": uid, "name": TARGET_UIDS.get(uid, uid)} for uid in creator_ids],
        "videos": videos,
        "logs": logs,
        "errors": [str(item.get("error") or "") for item in errors if item.get("error")],
        "sources": sources,
    }
    if WRITE_DEBUG_FILES:
        OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def parse_selected_videos(value: str) -> list[dict]:
    if not value.strip():
        return []
    parsed = json.loads(value)
    return parsed if isinstance(parsed, list) else []


def preview_mode(target_guns: list[str], creator_ids: list[str], video_ids: list[str], model: str, base_url: str, api_key: str, max_videos: int, selected_videos: list[dict] | None = None, concurrent: bool = False) -> dict:
    selected_videos = selected_videos or []
    if selected_videos:
        groups, logs, ai_errors = build_groups_from_videos(selected_videos, target_guns, model, base_url, api_key, concurrent)
        result = {
            "success": len(groups) > 0 and len(ai_errors) == 0,
            "model": model,
            "base_url": AI_BASE_URL,
            "target_guns": target_guns,
            "creatorIds": creator_ids,
            "videoIds": video_ids,
            "groups": groups,
            "logs": logs,
            "errors": ai_errors,
        }
        if WRITE_DEBUG_FILES:
            AI_OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result

    search_result = search_mode(target_guns, creator_ids, max_videos, concurrent)
    videos_by_id = {video.get("bvid") or video.get("id"): video for source in search_result.get("sources", []) for video in source.get("videos", [])}
    selected_videos = [videos_by_id[video_id] for video_id in video_ids if video_id in videos_by_id]

    if not selected_videos:
        result = {
            "success": False,
            "model": model,
            "target_guns": target_guns,
            "creatorIds": creator_ids,
            "videoIds": video_ids,
            "groups": [],
            "logs": [],
            "errors": ["未找到已选视频，请先重新搜索并选择视频"],
        }
        if WRITE_DEBUG_FILES:
            AI_OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result

    groups, logs, ai_errors = build_groups_from_videos(selected_videos, target_guns, model, base_url, api_key, concurrent)
    result = {
        "success": len(groups) > 0 and len(ai_errors) == 0,
        "model": model,
        "base_url": AI_BASE_URL,
        "target_guns": target_guns,
        "creatorIds": creator_ids,
        "videoIds": video_ids,
        "groups": groups,
        "logs": logs,
        "errors": [*search_result.get("errors", []), *ai_errors],
    }
    if WRITE_DEBUG_FILES:
        AI_OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def auto_mode(creator_ids: list[str], model: str, base_url: str, api_key: str) -> dict:
    sources, errors, cookie_source, logs = fetch_creator_videos(creator_ids, max_videos=1, concurrent=False)
    videos = []
    for source in sources:
        videos.extend(source.get("videos", []))

    if not videos:
        return {
            "success": False,
            "groups": [],
            "logs": logs,
            "errors": [str(item.get("error") or "") for item in errors if item.get("error")] or ["未获取到博主视频"]
        }

    groups, ai_logs, ai_errors = build_groups_from_videos(videos, [], model, base_url, api_key, False)
    return {
        "success": len(groups) > 0,
        "groups": groups,
        "logs": logs + ai_logs,
        "errors": [str(item.get("error") or "") for item in errors if item.get("error")] + ai_errors
    }

def test_model_mode(model: str, base_url: str, api_key: str) -> dict:
    started_at = time.perf_counter()
    try:
        content = call_ai('请只返回{"ok":true}', model, base_url, api_key, timeout=15)
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return {
            "model": model,
            "success": bool(content.strip()),
            "latencyMs": latency_ms,
            "error": None if content.strip() else "模型返回为空",
        }
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return {
            "model": model,
            "success": False,
            "latencyMs": latency_ms,
            "error": str(exc),
        }


def main():
    args = parse_args()
    target_guns = split_csv(args.guns) or DEFAULT_TARGET_GUNS
    creator_ids = [uid for uid in split_csv(args.creator_ids) if uid in TARGET_UIDS] or list(TARGET_UIDS.keys())
    video_ids = split_csv(args.video_ids)
    selected_videos = parse_selected_videos(args.videos_json)
    concurrent = str(args.concurrent).lower() == "true"

    if args.mode == "search":
        result = search_mode(target_guns, creator_ids, args.max_videos, concurrent)
    elif args.mode == "preview":
        result = preview_mode(target_guns, creator_ids, video_ids, args.model, args.base_url, args.api_key, args.max_videos, selected_videos, concurrent)
    elif args.mode == "auto":
        result = auto_mode(creator_ids, args.model, args.base_url, args.api_key)
    else:
        result = test_model_mode(args.model, args.base_url, args.api_key)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
