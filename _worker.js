/**
 * Telegram Group: https://t.me/AM_CLUBS
 * YouTube Channel: https://youtube.com/@AM_CLUB
 * GitHub Repository: https://github.com/amclubs
 * Personal Blog: https://am.809098.xyz
 */

let myToken = 'pwd';

export default {
    async fetch(request, env) {
        myToken = env.TOKEN || myToken;
        const KV = env.KV;
        const disguisePath = env.DISGUISE_URL || null; // 从环境变量中读取伪装路径，如果不存在则为 null

        if (!KV) {
            return createResponse('KV namespace is not bound', 400);
        }

        const url = new URL(request.url);
        const token = url.pathname === `/${myToken}` ? myToken : url.searchParams.get('token') || "null";

        // 判断是否设置了伪装路径
        if (disguisePath) {
            // 如果设置了伪装路径，所有配置页面返回伪装内容
            if (url.pathname === disguisePath || url.pathname === "/config" || url.pathname === `/${myToken}`) {
                return createResponse(disguisedHTML(), 200, 'text/html; charset=UTF-8');
            }
        } else {
            // 如果未设置伪装路径，正常显示配置页面和脚本生成页面
            const fileName = url.pathname.slice(1) || '';
            switch (fileName) {
                case "config":
                case myToken:
                    return createResponse(configHTML(url.hostname, token), 200, 'text/html; charset=UTF-8');
                case "config/update.bat":
                    return createFileResponse(downloadScript('bat', url.hostname, token), 'update.bat');
                case "config/update.sh":
                    return createFileResponse(downloadScript('sh', url.hostname, token), 'update.sh');
                default:
                    return await handleFileOperation(KV, fileName, url);
            }
        }

        // 如果请求路径与任何已知逻辑不匹配
        return createResponse('Not Found', 404);
    }
};

// 伪装页面 HTML 内容
function disguisedHTML() {
    return `
    <html>
        <head>
            <title>Welcome</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background-color: #f0f0f0;
                }
                h1 {
                    color: #333;
                }
                p {
                    color: #666;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to Our Site!</h1>
            <p>This is a public page for visitors. Enjoy browsing!</p>
        </body>
    </html>
    `;
}

// 真实配置页面的 HTML 内容
function configHTML(domain, token) {
    return `
    <html>
        <head>
            <title>am-cf-text2kv</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    text-align: left;
                }
                h1 {
                    margin-top: 20px;
                    font-size: 24px;
                }
                pre {
                    background: #f4f4f4;
                    padding: 10px;
                    border-radius: 5px;
                    text-align: left;
                    margin: 0;
                }
                button {
                    padding: 8px 12px;
                    margin: 5px;
                    cursor: pointer;
                }
                input {
                    padding: 8px;
                    width: 300px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <h1>am-cf-text2kv 配置页面</h1>
            <p>域名: <strong>${domain}</strong> <br>Token: <strong>${token}</strong></p>
        </body>
    </html>
    `;
}

// 处理文件操作的逻辑
async function handleFileOperation(KV, fileName, url) {
    const text = url.searchParams.get('text') || null;
    const b64 = url.searchParams.get('b64') || null;

    if (text === null && b64 === null) {
        const value = await KV.get(fileName);
        return createResponse(value || 'File not found', 200, 'text/plain; charset=utf-8');
    }

    await fileExists(KV, fileName);

    const valueToStore = b64 !== null ? base64Decode(replaceSpaceWithPlus(b64)) : text;
    await KV.put(fileName, valueToStore);
    return createResponse(valueToStore, 200, 'text/plain; charset=utf-8');
}

// 检查文件是否存在
async function fileExists(KV, filename) {
    return await KV.get(filename) !== null;
}

// Base64 解码
function base64Decode(str) {
    return new TextDecoder('utf-8').decode(Uint8Array.from(atob(str), c => c.charCodeAt(0)));
}

// 替换空格为加号
function replaceSpaceWithPlus(str) {
    return str.replace(/ /g, '+');
}

// 创建普通响应
function createResponse(body, status, contentType = 'text/plain; charset=utf-8') {
    return new Response(body, {
        status,
        headers: { 'content-type': contentType },
    });
}

// 创建文件下载响应
function createFileResponse(content, filename) {
    return new Response(content, {
        headers: {
            "Content-Disposition": `attachment; filename=${filename}`,
            "content-type": "text/plain; charset=utf-8",
        },
    });
}

// 下载脚本内容
function downloadScript(type, domain, token) {
    if (type === 'bat') {
        return [
            `@echo off`,
            `chcp 65001`,
            `setlocal`,
            ``,
            `set "DOMAIN=${domain}"`,
            `set "TOKEN=${token}"`,
            ``,
            `set "FILENAME=%~nx1"`,
            ``,
            `for /f "delims=" %%i in ('powershell -command "$content = ((Get-Content -Path '%cd%/%FILENAME%' -Encoding UTF8) | Select-Object -First 65) -join [Environment]::NewLine; [convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))"') do set "BASE64_TEXT=%%i"`,
            ``,
            `set "URL=https://%DOMAIN%/%FILENAME%?token=%TOKEN%^&b64=%BASE64_TEXT%"`,
            ``,
            `start %URL%`,
            `endlocal`,
            ``,
            `echo Update completed, closing window in 5 seconds...`,
            `timeout /t 5 >nul`,
            `exit`
        ].join('\r\n');
    } else if (type === 'sh') {
        return `#!/bin/bash
export LANG=zh_CN.UTF-8
DOMAIN="${domain}"
TOKEN="${token}"
if [ -n "$1" ]; then 
  FILENAME="$1"
else
  echo "No filename provided"
  exit 1
fi
BASE64_TEXT=$(head -n 65 "$FILENAME" | base64 -w 0)
curl -k "https://$DOMAIN/$FILENAME?token=$TOKEN&b64=$BASE64_TEXT"
echo "Update completed"
`;
    }
}

