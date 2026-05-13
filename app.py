"""
============================================================
ELECTRICREDIT V2 - MAIN FLASK APP
File: app.py

Purpose:
- Main Flask entry point
- Create Flask app
- Serve templates/static files
- Register routes from routing.py
- Do NOT create tables here
- Do NOT seed database here

Database setup:
database/create_database.py

Routes:
routing.py
============================================================
"""

from __future__ import annotations

from flask import Flask, render_template, request

from routing import register_routes


app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
)


# ==========================================================
# WEB ROUTES
# ==========================================================

@app.get("/")
def index():
    return render_template("index.html")


@app.get("/home")
@app.get("/dashboard")
@app.get("/hardware")
@app.get("/peopleware")
@app.get("/software")
@app.get("/about")
def spa_fallback():
    return render_template("index.html")


# ==========================================================
# API ROUTES
# ==========================================================

register_routes(app)


# ==========================================================
# ERROR HANDLERS
# ==========================================================

@app.errorhandler(404)
def not_found(_):
    if request.path.startswith("/api/"):
        return {
            "status": "error",
            "message": "API route not found.",
        }, 404

    return render_template("index.html")


@app.errorhandler(405)
def method_not_allowed(_):
    return {
        "status": "error",
        "message": "Method not allowed.",
    }, 405


@app.errorhandler(500)
def internal_error(err):
    return {
        "status": "error",
        "message": f"Internal server error: {err}",
    }, 500


# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":
    print("============================================================")
    print("ElectriCredit v2 Flask server")
    print("Purpose: main runner")
    print("Routes:  routing.py")
    print("DB init: database/create_database.py")
    print("Open:   http://127.0.0.1:5000")
    print("LAN:    http://0.0.0.0:5000")
    print("============================================================")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )