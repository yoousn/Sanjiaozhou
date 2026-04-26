from playwright.sync_api import sync_playwright
import json

CHROMIUM_EXECUTABLE_PATH = "/usr/bin/chromium"


def get_passwords_low_mem():
    try:
        with sync_playwright() as p:
            # 【内存优化核心1】添加极简启动参数，关闭所有不必要的显卡和沙盒进程
            browser = p.chromium.launch(
                executable_path=CHROMIUM_EXECUTABLE_PATH,
                headless=True,
                args=[
                    '--disable-gpu',              # 禁用GPU硬件加速
                    '--disable-dev-shm-usage',    # 克服有限的资源限制
                    '--no-sandbox',               # 禁用沙盒模式（极大减少进程数）
                    '--disable-extensions',       # 禁用扩展
                    '--mute-audio'                # 静音
                ]
            )
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            
            # 【内存优化核心2】拦截并直接丢弃所有图片、CSS样式、视频和字体资源
            # 浏览器只需要加载纯 HTML 和 JS 即可破译盾牌和抓取数据
            page.route("**/*", lambda route: route.abort() 
                if route.request.resource_type in ["image", "stylesheet", "font", "media"] 
                else route.continue_())
            
            api_passwords = {}
            
            # 直接监听后台 API 请求，拿来主义
            def handle_response(response):
                if "getOVData" in response.url and response.status == 200:
                    try:
                        data = response.json()
                        bd_data = data.get("data", {}).get("bdData")
                        if bd_data:
                            api_passwords["零号大坝"] = bd_data.get("db", {}).get("password", "未发现数据")
                            api_passwords["长弓溪谷"] = bd_data.get("cgxg", {}).get("password", "未发现数据")
                            api_passwords["巴克什"] = bd_data.get("bks", {}).get("password", "未发现数据")
                            api_passwords["航天基地"] = bd_data.get("htjd", {}).get("password", "未发现数据")
                            api_passwords["潮汐监狱"] = bd_data.get("cxjy", {}).get("password", "未发现数据")
                    except:
                        pass
                        
            page.on("response", handle_response)
            
            try:
                # wait_until="domcontentloaded" 让它不需要等页面全白加载完，DOM 出来就行
                page.goto("https://www.kkrb.net/?viewpage=view%2Foverview", wait_until="domcontentloaded", timeout=20000)
                # 给 JS 引擎 5 秒钟时间去计算 WAF 挑战并拿到真正的 API 返回
                page.wait_for_timeout(5000)
            except Exception:
                pass 
                
            browser.close()
            
            if api_passwords:
                return api_passwords
            else:
                return {"error": "破解完成，但未能截获到有效密码数据，可能页面结构改变。"}

    except Exception as e:
        return {"error": f"脚本运行异常: {str(e)}"}

if __name__ == "__main__":
    result = get_passwords_low_mem()
    print(json.dumps(result, ensure_ascii=False))