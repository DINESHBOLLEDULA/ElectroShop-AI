from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def home():
    return {
        "message": "Backend running 🚀",
        "status": "connected"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }