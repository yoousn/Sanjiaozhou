from playwright.sync_api import sync_playwright
import json
import re
import sys

CHROMIUM_EXECUTABLE_PATH = "/usr/bin/chromium"


def clean_title(value):
    text = str(value or "")
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&amp;", "&")
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"\s*-\s*抖音.*$", "", text, flags=re.I)
    text = re.sub(r"^抖音\s*-\s*", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:80]


def share_title(raw):
    text = re.sub(r"\s+", " ", str(raw or "")).strip()
    before_url = re.sub(r"https?://\S+.*", "", text, flags=re.I)
    m = re.search(r"的作品】\s*([^@#，,。！!？?\n]{4,120})", before_url)
    if m:
        return clean_title(m.group(1))
    m = re.search(r"】\s*([^@#，,。！!？?\n]{4,120})", before_url)
    if m:
        return clean_title(m.group(1))
    m = re.search(r"【([^】]{2,100})】", text)
    return clean_title(m.group(1) if m else "")


def extract_url(raw):
    m = re.search(r"https?://(?:www\.)?(?:douyin\.com/(?:video/\d+|jingxuan\?modal_id=\d+|jingxuan\S*)|v\.douyin\.com/[A-Za-z0-9_/-]+)", str(raw or ""), re.I)
    return m.group(0) if m else ""


def video_id(raw):
    text = str(raw or "")
    m = re.search(r"douyin\.com/video/(\d+)", text, re.I) or re.search(r"[?&]modal_id=(\d+)", text, re.I)
    return m.group(1) if m else ""


def first_url(value):
    if isinstance(value, str) and value.startswith(("http://", "https://", "//")):
        return "https:" + value if value.startswith("//") else value.replace("http://", "https://", 1)
    if isinstance(value, list):
        for item in value:
            found = first_url(item)
            if found:
                return found
    if isinstance(value, dict):
        for key in ("url_list", "uri", "url", "cover", "origin_cover", "dynamic_cover", "cover_url"):
            if key in value:
                found = first_url(value.get(key))
                if found:
                    return found
    return ""


def walk(obj):
    title = ""
    cover = ""
    stack = [obj]
    seen = 0
    while stack and seen < 3000:
        seen += 1
        cur = stack.pop()
        if isinstance(cur, dict):
            if not title:
                for key in ("desc", "title", "description"):
                    val = cur.get(key)
                    if isinstance(val, str) and len(val.strip()) >= 4:
                        title = clean_title(val)
                        break
            if not cover:
                for key in ("cover", "origin_cover", "dynamic_cover", "cover_url", "video_cover"):
                    if key in cur:
                        cover = first_url(cur.get(key))
                        if cover:
                            break
            if title and cover:
                break
            stack.extend(cur.values())
        elif isinstance(cur, list):
            stack.extend(cur)
    return title, cover


def resolve(raw):
    fallback_title = share_title(raw)
    url = extract_url(raw) or str(raw or "").strip()
    if not url:
        return {"success": False, "title": fallback_title, "url": "", "coverUrl": "", "error": "no url"}

    result = {"success": True, "title": fallback_title, "url": url, "coverUrl": ""}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=CHROMIUM_EXECUTABLE_PATH,
                headless=True,
                args=["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox", "--disable-extensions", "--mute-audio"],
            )
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                viewport={"width": 1365, "height": 768},
                locale="zh-CN",
            )
            page = context.new_page()
            page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "stylesheet", "font", "media"] else route.continue_())

            def handle_response(response):
                if result["title"] and result["coverUrl"]:
                    return
                if not any(k in response.url.lower() for k in ["aweme", "detail", "item", "modal", "video"]):
                    return
                try:
                    ct = response.headers.get("content-type", "")
                    if "json" not in ct and response.status != 200:
                        return
                    data = response.json()
                    title, cover = walk(data)
                    if title and not result["title"]:
                        result["title"] = title
                    if cover and not result["coverUrl"]:
                        result["coverUrl"] = cover
                except Exception:
                    pass

            page.on("response", handle_response)
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=18000)
                page.wait_for_timeout(6000)
            except Exception:
                pass

            final_url = page.url or url
            vid = video_id(final_url) or video_id(url)
            result["url"] = f"https://www.douyin.com/video/{vid}" if vid else final_url

            try:
                if not result["title"]:
                    result["title"] = clean_title(page.locator("meta[property='og:title']").get_attribute("content") or page.title())
                if not result["coverUrl"]:
                    result["coverUrl"] = first_url(page.locator("meta[property='og:image']").get_attribute("content") or "")
            except Exception:
                pass

            browser.close()
    except Exception as e:
        result["error"] = str(e)

    if not result["title"]:
        result["title"] = fallback_title
    result["coverUrl"] = first_url(result.get("coverUrl", ""))
    result["success"] = bool(result["title"] or result["url"])
    return result


if __name__ == "__main__":
    raw = " ".join(sys.argv[1:])
    print(json.dumps(resolve(raw), ensure_ascii=False))
