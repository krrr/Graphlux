import uvicorn
from graphlux import get_server_config


if __name__ == "__main__":
    host, port = get_server_config()

    uvicorn.run(
        "graphlux.api:app",      # 也可以直接传变量 app，但传字符串支持 "reload"
        host=host,
        port=port,
        reload=True,     # 只有在以字符串形式传入 app 时才有效
        workers=1        # 工作进程数
    )
