from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    username: str
    email: str
    age: int

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

@app.post("/users/")
async def create_user(user: User):
    # API Sentinel should detect the 'username', 'email', 'age' fields from context
    data = {"username": user.username, "email": user.email}
    return data

@app.put("/users/{user_id}")
async def update_user(user_id: int, active: bool):
    # Auth detection
    # @login_required
    return {"user_id": user_id, "active": active}
