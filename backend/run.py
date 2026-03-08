import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "cyberhamster:app",      # 也可以直接传变量 app，但传字符串支持 "reload"
        host="127.0.0.1",
        port=8000,
        reload=True,     # 只有在以字符串形式传入 app 时才有效
        workers=1        # 工作进程数
    )