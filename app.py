from flask import Flask, render_template, request, redirect, flash, session,jsonify
import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from google import genai
app = Flask(__name__)


# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)


app.secret_key = "SafeHer AI"

# 📧 Email Configuration
EMAIL_USER = "safeherai5@gmail.com"
# App Password मधील Spaces (मोकळ्या जागा) काढून टाका
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


# Database create
def create_database():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        email TEXT UNIQUE,
        password TEXT
    )
    """)

    cursor.execute("""
CREATE TABLE IF NOT EXISTS sos_alerts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    message TEXT,
    location TEXT,
    status TEXT
)
""")
    
    cursor.execute("""
CREATE TABLE IF NOT EXISTS guardians(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    guardian_name TEXT,
    guardian_number TEXT,
    guardian_email TEXT
)
""")
    
    cursor.execute("""
CREATE TABLE IF NOT EXISTS locations(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    latitude TEXT,
    longitude TEXT
)
""")
    
    cursor.execute("""
CREATE TABLE IF NOT EXISTS safety_status(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    status TEXT
)
""")
    
    cursor.execute("""
CREATE TABLE IF NOT EXISTS emergency_contacts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    contact_name TEXT,
    contact_number TEXT
)
""")
    
    cursor.execute("""
CREATE TABLE IF NOT EXISTS battery_alerts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    battery_level TEXT,
    status TEXT
)
""")

    conn.commit()
    conn.close()


create_database()



@app.route("/")
def home():
    return render_template("index.html")





@app.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":

        fullname = request.form["fullname"]
        email = request.form["email"]
        password = request.form["password"]

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM users WHERE email=?",
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            conn.close()

            flash("Email already registered. Please login.")

            return redirect("/signup")

        cursor.execute(
            "INSERT INTO users(fullname,email,password) VALUES(?,?,?)",
            (fullname, email, password)
        )

        user_id = cursor.lastrowid

        conn.commit()
        conn.close()

        # Login session create
        session["user_id"] = user_id
        session["user_email"] = email

        return redirect("/dashboard")

    return render_template("signup.html")
      


# DAshboard
@app.route("/dashboard")
def dashboard():

    if "user_email" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT fullname
        FROM users
        WHERE email=?
        """,
        (session["user_email"],)
    )

    user = cursor.fetchone()

    cursor.execute(
    """
    SELECT COUNT(*)
    FROM emergency_contacts
    WHERE user_email=?
    """,
    (session["user_email"],)
    )

    contact_count = cursor.fetchone()[0]


    cursor.execute(
    """
    SELECT COUNT(*)
    FROM guardians
    WHERE user_email=?
    """,
    (session["user_email"],)
    )

    guardian_count = cursor.fetchone()[0]

    conn.close()


    return render_template(
        "dashboard.html",
        user=user,
        contact_count=contact_count,
        guardian_count=guardian_count
    )



@app.route("/profile")
def profile():

    if "user_email" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fullname, email, phone, age, address
        FROM users
        WHERE email=?
    """, (session["user_email"],))

    user = cursor.fetchone()

    conn.close()

    return render_template("profile.html", user=user)





@app.route("/update_profile", methods=["POST"])
def update_profile():

    if "user_email" not in session:
        return redirect("/login")

    fullname = request.form["fullname"]
    email = request.form["email"]
    phone = request.form["phone"]
    age = request.form["age"]
    address = request.form["address"]

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE users
        SET fullname=?, email=?, phone=?, age=?, address=?
        WHERE email=?
    """, (
        fullname,
        email,
        phone,
        age,
        address,
        session["user_email"]
    ))

    conn.commit()
    conn.close()

    session["user_email"] = email

    flash("Profile updated successfully!")

    return redirect("/profile")




@app.route("/safety_history")
def safety_history():

    if "user_email" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, message, location, status
    FROM sos_alerts
    WHERE user_email=?
    ORDER BY id DESC
    """, (session["user_email"],))

    alerts = cursor.fetchall()

    conn.close()

    return render_template(
        "safety_history.html",
        alerts=alerts
    )


@app.route("/delete_alert/<int:alert_id>", methods=["POST"])
def delete_alert(alert_id):

    if "user_email" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM sos_alerts
        WHERE id=? AND user_email=?
    """, (alert_id, session["user_email"]))

    conn.commit()
    conn.close()

    return redirect("/safety_history")


#AI ASSISTANT

@app.route("/ai_assistant", methods=["GET", "POST"])
def ai_assistant():

    if "user_email" not in session:
        return redirect("/login")

    if request.method == "POST":

        question = request.form.get("question", "").strip()

        if not question:
            return jsonify({"response": "Please enter your question."})

        q = question.lower()
        print("Question:", q)

        # ===========================
        # PREDEFINED SAFEHER ANSWERS
        # ===========================

        if any(word in q for word in ["hi", "hello", "hey"]):
            print("HI BLOCK EXECUTED")
            return jsonify({
                "response": """👋 Hi! I'm SafeHer AI.

How can I help you today?

🚶 Travel Safety
🚨 Emergency Help
🔒 Online Safety
🥋 Self Defense
🛡️ Women Safety Tips"""
            })

        elif any(word in q for word in [
            "travel", "travelling", "traveling",
            "alone", "night", "cab", "uber",
            "taxi", "bus", "train"
        ]):
            return jsonify({
                "response": """🚶 Solo Travel Safety Tips

1. Share your live location with family.
2. Stay on well-lit roads.
3. Keep your phone charged.
4. Avoid isolated places.
5. Press the SafeHer SOS button if you feel unsafe."""
            })

        elif any(word in q for word in [
            "help",
            "danger",
            "unsafe",
            "sos",
            "attack",
            "kidnap",
            "emergency",
            "harassment"
        ]):
            return jsonify({
                "response": """🚨 Emergency Steps

1. Stay calm.
2. Move to a crowded public place.
3. Call 112 immediately.
4. Press the SafeHer SOS button.
5. Share your live location with trusted contacts."""
            })

        elif "someone is following me" in q:
            return jsonify({
                "response": """⚠️ Someone is Following You

• Do NOT go home.
• Enter a nearby shop or police station.
• Call someone you trust.
• Press the SafeHer SOS button.
• Call 112 immediately if you are in danger."""
            })

        elif "pepper spray" in q:
            return jsonify({
                "response": "Carry pepper spray only where it is legal. Keep it easily accessible and learn how to use it safely."
            })

        elif any(word in q for word in [
            "cyber", "online", "instagram",
            "facebook", "whatsapp", "hack"
        ]):
            return jsonify({
                "response": """🔒 Online Safety Tips

• Never share OTP or passwords.
• Enable Two-Factor Authentication.
• Block suspicious users.
• Report cyber harassment.
• Use strong passwords."""
            })

        elif any(word in q for word in [
            "self defense", "self defence"
        ]):
            return jsonify({
                "response": """🥋 Self Defense Tips

• Stay confident.
• Maintain distance.
• Shout loudly for help.
• Escape if possible.
• Contact police immediately."""
            })

        # ===========================
        # GEMINI FOR OTHER QUESTIONS
        # ===========================

        try:

            prompt = f"""
You are SafeHer AI.

Rules:
- Reply in less than 80 words.
- Never introduce yourself.
- Never say "Hello! I am SafeHer AI."
- Answer only the user's question.
- Be friendly, practical and supportive.
- Focus mainly on women's safety.
- If the question is unrelated to safety, answer briefly and politely.

Question:
{question}
"""

            result = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt
            )

            answer = result.text.strip() if result.text else "Sorry, I couldn't generate a response."

            return jsonify({"response": answer})

        except Exception as e:
            print(e)
            return jsonify({
                "response": "⚠️ AI service is temporarily unavailable. Please try again."
            })

    return render_template("ai_assistant.html")


# Add contact
@app.route("/add_contact", methods=["GET","POST"])
def add_contact():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    if request.method == "POST":

        name = request.form["name"]
        number = request.form["number"]


        cursor.execute(
        """
        INSERT INTO emergency_contacts
        (user_email, contact_name, contact_number)
        VALUES(?,?,?)
        """,
        (
            session["user_email"],
            name,
            number
        ))

        conn.commit()



    cursor.execute(
    """
    SELECT id, contact_name, contact_number
    FROM emergency_contacts
    WHERE user_email=?
    """,
    (session["user_email"],)
    )


    contacts = cursor.fetchall()


    conn.close()


    return render_template(
        "add_contact.html",
        contacts=contacts
    )

@app.route("/delete_contact/<int:id>")
def delete_contact(id):

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM emergency_contacts
        WHERE id=?
        """,
        (id,)
    )

    conn.commit()
    conn.close()

    return redirect("/dashboard")

@app.route("/edit_contact/<int:id>", methods=["GET","POST"])
def edit_contact(id):

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    if request.method == "POST":

        name = request.form["name"]
        number = request.form["number"]

        cursor.execute(
        """
        UPDATE emergency_contacts
        SET contact_name=?, contact_number=?
        WHERE id=?
        """,
        (
            name,
            number,
            id
        ))

        conn.commit()

        conn.close()

        return redirect("/add_contact")


    cursor.execute(
    """
    SELECT contact_name, contact_number
    FROM emergency_contacts
    WHERE id=?
    """,
    (id,)
    )

    contact = cursor.fetchone()

    conn.close()


    return render_template(
        "edit_contact.html",
        contact=contact
    )

# ===============
# Guardian
# ===============

@app.route("/guardian")
def guardian():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT id, guardian_name, guardian_number
        FROM guardians
        WHERE user_email=?
        """,
        (session["user_email"],)
    )


    guardians = cursor.fetchall()


    conn.close()


    return render_template(
        "guardian.html",
        guardians=guardians
    )

# add guardian
@app.route("/add_guardian", methods=["POST","POST"])
def add_guardian():

    name = request.form["name"]
    number = request.form["number"]
    guardian_email = request.form["guardian_email"]


    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    cursor.execute(
    """
    INSERT INTO guardians
    (user_email, guardian_name, guardian_number,guardian_email)
    VALUES(?,?,?,?)
    """,
    (
        session["user_email"],
        name,
        number,
        guardian_email
    ))


    conn.commit()
    conn.close()


    return redirect("/guardian")


# delete guardian

@app.route("/delete_guardian/<int:id>")
def delete_guardian(id):

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
    """
    DELETE FROM guardians
    WHERE id=?
    """,
    (id,)
    )

    conn.commit()
    conn.close()

    return redirect("/guardian")

@app.route("/edit_guardian/<int:id>", methods=["GET","POST"])
def edit_guardian(id):

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    if request.method == "POST":

        name = request.form["name"]
        number = request.form["number"]


        cursor.execute(
        """
        UPDATE guardians
        SET guardian_name=?, guardian_number=?
        WHERE id=?
        """,
        (
            name,
            number,
            id
        ))


        conn.commit()
        conn.close()

        return redirect("/guardian")


    cursor.execute(
    """
    SELECT guardian_name, guardian_number
    FROM guardians
    WHERE id=?
    """,
    (id,)
    )


    guardian = cursor.fetchone()

    conn.close()


    return render_template(
        "edit_guardian.html",
        guardian=guardian
    )



@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, email
            FROM users
            WHERE email=? AND password=?
        """, (email, password))

        user = cursor.fetchone()

        conn.close()

        if user:

            session["user_id"] = user[0]
            session["user_email"] = user[1]

            return redirect("/dashboard")

        else:
            return "Invalid Email or Password"

    return render_template("login.html")



# ==============
# Send send_sos
# ===============

@app.route("/send_sos", methods=["POST"])
def send_sos():

    print("sos button clicked")

    message = "Emergency Alert! User needs help."
    status = "Active"


    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    cursor.execute(
    """
    SELECT latitude, longitude
    FROM locations
    WHERE user_email=?
    ORDER BY id DESC
    LIMIT 1
    """,
    (session["user_email"],)
    )
    
    last_location = cursor.fetchone()

    cursor.execute(
    """
    SELECT guardian_name, guardian_email
    FROM guardians
    WHERE user_email=?
    """,
    (session["user_email"],)
    )

    guardians = cursor.fetchall()
    if last_location:
        latitude = last_location[0]
        longitude = last_location[1]

        location = (
            f"Latitude: {latitude}\n"
            f"Longitute: {longitude}\n\n"
            f"Google Maps:\n"

    f"https://www.google.com/maps?q={latitude},{longitude}"
        )
        print(location)


    else:

        location = "Location not available"



    cursor.execute(
    """
    INSERT INTO sos_alerts
    (user_email, message, location, status)
    VALUES (?, ?, ?, ?)
    """,
    (
        session["user_email"],
        message,
        location,
        status
    )
    )


    conn.commit()
    conn.close()




    try:


        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)

        map_link = "Location not available"

        if last_location:
            map_link = f"https://www.google.com/maps?q={last_location[0]},{last_location[1]}"

        for guardian in guardians:

            guardian_name = guardian[0]
            guardian_email = guardian[1]

            email_text = f"""🚨 Emergency Alert!

     Hello {guardian_name},

    User: {session["user_email"]}

    User needs immediate help.

    Latitude: {last_location[0] if last_location else 'N/A'}
    Longitude: {last_location[1] if last_location else 'N/A'}

    📍 Google Maps:
    {map_link}
    """

            msg = MIMEText(email_text)

            msg["Subject"] = "SafeHer AI - SOS Alert"
            msg["From"] = EMAIL_USER
            msg["To"] = guardian_email

            server.send_message(msg)

        server.quit()

    except Exception as e:
        print("Email Error:", e)

    
    return render_template("sos_success.html",guardians=guardians)

# ===========
# auto sos
# =============
@app.route("/auto_sos", methods=["POST"])
def auto_sos():

    message = "🚨 Auto SOS Activated by AI"
    status = "Active"

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT latitude, longitude
    FROM locations
    WHERE user_email=?
    ORDER BY id DESC
    LIMIT 1
    """, (session["user_email"],))

    last_location = cursor.fetchone()

    cursor.execute("""
    SELECT guardian_name, guardian_email
    FROM guardians
    WHERE user_email=?
    """, (session["user_email"],))

    guardians = cursor.fetchall()

    if last_location:

        location = (
            "Latitude: " + str(last_location[0]) +
            " Longitude: " + str(last_location[1])
        )

    else:

        location = "Location not available"

    cursor.execute("""
    INSERT INTO sos_alerts
    (user_email, message, location, status)
    VALUES (?, ?, ?, ?)
    """, (
        session["user_email"],
        message,
        location,
        status
    ))

    conn.commit()
    conn.close()

    try:

        server = smtplib.SMTP("smtp.gmail.com",587)
        server.starttls()
        server.login(EMAIL_USER,EMAIL_PASSWORD)

        for guardian in guardians:

             guardian_name = guardian[0]
             guardian_email = guardian[1]

        msg = MIMEText(
                  "🚨 AUTO SOS ALERT!\n\n"
                  "High Risk Area Detected.\n\n"
                  "User may be in danger.\n\n"
                  "Location:\n" + location
                 )

        msg["Subject"] = "🚨 SafeHer AI Auto SOS"
        msg["From"] = EMAIL_USER
        msg["To"] = guardian_email

        server.send_message(msg)

        server.quit()

    except Exception as e:
         print("Email Error:", e)

    return jsonify({
    "message":"🚨 Auto SOS Activated Successfully!"
})



# =========================
# SAVE LOCATION
# =========================

@app.route("/save_location", methods=["POST"])
def save_location():

    if "user_email" not in session:
        return {"success": False, "message": "User not logged in"}, 401

    try:

        data = request.get_json()

        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if latitude is None or longitude is None:
            return {
                "success": False,
                "message": "Latitude or Longitude missing"
            }, 400


        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()


        cursor.execute(
            """
            INSERT INTO locations
            (user_email, latitude, longitude)
            VALUES (?, ?, ?)
            """,
            (
                session["user_email"],
                latitude,
                longitude
            )
        )


        conn.commit()
        conn.close()


        print("Location Saved:")
        print("Latitude:", latitude)
        print("Longitude:", longitude)


        return {
            "success": True,
            "message": "Location Saved"
        }


    except Exception as e:

        print("Location Error:", e)

        return {
            "success": False,
            "message": str(e)
        }, 500


# safe route 
@app.route("/safe_route")
def safe_route():

    return render_template("safe_route.html")


# safety check
@app.route("/safety_check", methods=["POST"])
def safety_check():

    status = request.form["status"]


    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    cursor.execute(
    """
    INSERT INTO safety_status
    (user_email, status)
    VALUES (?,?)
    """,
    (
        session["user_email"],
        status
    ))


    conn.commit()
    conn.close()


    return redirect("/dashboard")



# battery_alert

@app.route("/battery_alert", methods=["POST"])
def battery_alert():
    print("battery alert battery called")

    data = request.get_json()

    level = data["battery"]


    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
    """
    SELECT guardian_name, guardian_email
    FROM guardians
    WHERE user_email=?
    """,
    (session["user_email"],))

    guardians = cursor.fetchall()

    cursor.execute("""
    SELECT latitude, longitude
    FROM locations
    WHERE user_email=?
    ORDER BY id DESC
    LIMIT 1
    """, 
    (session["user_email"],))

    location = cursor.fetchone()

    if location:
     latitude = location[0]
     longitude = location[1]
     map_link = f"https://www.google.com/maps?q={latitude},{longitude}"
    else:
     map_link = "Location not available"


    cursor.execute(
    """
    INSERT INTO battery_alerts
    (user_email, battery_level, status)
    VALUES(?,?,?)
    """,
    (
        session["user_email"],
        level,
        "Low Battery"
    ))

    try:
       server = smtplib.SMTP("smtp.gmail.com", 587)
       server.starttls()
       server.login(EMAIL_USER, EMAIL_PASSWORD)

       for guardian in guardians:

        guardian_email = guardian[1]

        msg = MIMEText(
            "🔋 Low Battery Alert!\n\n"
            f"User: {session['user_email']}\n\n"
            f"Battery Level: {level}%\n\n"
            f"location:\n{map_link}\n\n"
            "Please contact the user immediately."
        )

        msg["Subject"] = "SafeHer AI - Low Battery Alert"
        msg["From"] = EMAIL_USER
        msg["To"] = guardian_email

        server.send_message(msg)

       server.quit()

    except Exception as e:
      print("Battery Email Error:", e)



    conn.commit()
    conn.close()


    return "Battery Alert Saved"

# =============
# setting
# ==============

@app.route("/settings")
def settings():

    if "user_email" not in session:
        return redirect("/login")

    return render_template("settings.html")



@app.route("/account_settings")
def account_settings():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT fullname, email
    FROM users
    WHERE email=?
    """, (session["user_email"],))

    user = cursor.fetchone()

    conn.close()

    return render_template(
        "account_settings.html",
        user=user
    )

@app.route("/update_account", methods=["POST"])
def update_account():

    fullname = request.form["fullname"]
    email = request.form["email"]

    current_password = request.form["current_password"]
    new_password = request.form["new_password"]
    confirm_password = request.form["confirm_password"]

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()


    if new_password != "":

        if new_password != confirm_password:

            conn.close()
            return "New Password and Confirm Password do not match"

        cursor.execute("""
        SELECT password
        FROM users
        WHERE email=?
        """,
        (session["user_email"],))

        old_password = cursor.fetchone()[0]

        if current_password != old_password:

            conn.close()
            return "Current Password is incorrect"

        cursor.execute("""
        UPDATE users
        SET fullname=?,
            email=?,
            password=?
        WHERE email=?
        """,
        (
            fullname,
            email,
            new_password,
            session["user_email"]
        ))

    else:

        cursor.execute("""
        UPDATE users
        SET fullname=?,
            email=?
        WHERE email=?
        """,
        (
            fullname,
            email,
            session["user_email"]
        ))

    conn.commit()
    conn.close()

    session["user_email"] = email

    return redirect("/account_settings")

@app.route("/notification_settings")
def notification_settings():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT sos_alert,battery_alert,location_alert
    FROM notification_settings
    WHERE user_email=?
    """,
    (session["user_email"],))

    settings = cursor.fetchone()

    if settings is None:

        cursor.execute("""
        INSERT INTO notification_settings(user_email)
        VALUES(?)
        """,
        (session["user_email"],))

        conn.commit()

        settings=(1,1,1)

    conn.close()

    return render_template(
        "notification_settings.html",
        settings=settings
    )

@app.route("/save_notifications", methods=["POST"])
def save_notifications():

    sos = 1 if "sos_alert" in request.form else 0
    battery = 1 if "battery_alert" in request.form else 0
    location = 1 if "location_alert" in request.form else 0

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE notification_settings
    SET sos_alert=?,
        battery_alert=?,
        location_alert=?
    WHERE user_email=?
    """,
    (
        sos,
        battery,
        location,
        session["user_email"]
    ))

    conn.commit()
    conn.close()

    return redirect("/settings")



@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")

@app.route("/privacy")
def privacy():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT profile_private,
           share_location,
           data_collection
    FROM privacy_settings
    WHERE user_id=?
    """,(session["user_id"],))

    privacy = cursor.fetchone()

    conn.close()

    if privacy is None:
        privacy = (0,1,1)

    return render_template(
        "privacy.html",
        privacy=privacy
    )

@app.route("/save_privacy", methods=["POST"])
def save_privacy():

    if "user_id" not in session:
        return redirect("/login")

    profile_private = 1 if request.form.get("profile_private") else 0
    share_location = 1 if request.form.get("share_location") else 0
    data_collection = 1 if request.form.get("data_collection") else 0

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id
    FROM privacy_settings
    WHERE user_id=?
    """,(session["user_id"],))

    row = cursor.fetchone()

    if row:

        cursor.execute("""
        UPDATE privacy_settings
        SET profile_private=?,
            share_location=?,
            data_collection=?
        WHERE user_id=?
        """,(
            profile_private,
            share_location,
            data_collection,
            session["user_id"]
        ))

    else:

        cursor.execute("""
        INSERT INTO privacy_settings(
        user_id,
        profile_private,
        share_location,
        data_collection
        )
        VALUES(?,?,?,?)
        """,(
            session["user_id"],
            profile_private,
            share_location,
            data_collection
        ))

    conn.commit()
    conn.close()

    return redirect("/privacy")

@app.route("/delete_account", methods=["POST"])
def delete_account():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Users
    cursor.execute(
        "DELETE FROM users WHERE id=?",
        (session["user_id"],)
    )

    # Guardians
    cursor.execute(
        "DELETE FROM guardians WHERE user_email=?",
        (session["user_email"],)
    )

    # Locations
    cursor.execute(
        "DELETE FROM locations WHERE user_email=?",
        (session["user_email"],)
    )

    # sos alert
    cursor.execute(
    "DELETE FROM sos_alerts WHERE user_email=?",
    (session["user_email"],)
    )

    # Privacy
    cursor.execute(
        "DELETE FROM privacy_settings WHERE user_id=?",
        (session["user_id"],)
    )

    conn.commit()
    conn.close()

    session.clear()

    return redirect("/login")


@app.route("/theme")
def theme():
    return render_template("theme.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/support")
def support():
    return render_template("support.html")

# AI monitoring
@app.route("/toggle_ai", methods=["POST"])
def toggle_ai():

    if "user_id" not in session:
        return {"success": False}

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT status FROM ai_monitoring WHERE user_id=?",
        (session["user_id"],)
    )

    row = cursor.fetchone()

    if row:

        new_status = 0 if row[0] == 1 else 1

        cursor.execute(
            "UPDATE ai_monitoring SET status=? WHERE user_id=?",
            (new_status, session["user_id"])
        )

    else:

        new_status = 1

        cursor.execute(
            "INSERT INTO ai_monitoring(user_id,status) VALUES(?,?)",
            (session["user_id"], new_status)
        )

    conn.commit()
    conn.close()

    return {"success": True, "status": new_status}




# =====================================================
# START AI MONITORING
# =====================================================

@app.route("/start_ai", methods=["POST"])
def start_ai():

    if "user_id" not in session:
        return {"success": False, "status": 0}

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT status FROM ai_monitoring WHERE user_id=?",
        (session["user_id"],)
    )

    row = cursor.fetchone()

    if row:
        cursor.execute(
            "UPDATE ai_monitoring SET status=1 WHERE user_id=?",
            (session["user_id"],)
        )
    else:
        cursor.execute(
            "INSERT INTO ai_monitoring(user_id,status) VALUES(?,1)",
            (session["user_id"],)
        )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "status": 1
    }


# =====================================================
# STOP AI MONITORING
# =====================================================

@app.route("/stop_ai", methods=["POST"])
def stop_ai():

    if "user_id" not in session:
        return {"success": False, "status": 0}

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT status FROM ai_monitoring WHERE user_id=?",
        (session["user_id"],)
    )

    row = cursor.fetchone()

    if row:
        cursor.execute(
            "UPDATE ai_monitoring SET status=0 WHERE user_id=?",
            (session["user_id"],)
        )
    else:
        cursor.execute(
            "INSERT INTO ai_monitoring(user_id,status) VALUES(?,0)",
            (session["user_id"],)
        )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "status": 0
    }


# =========================
# Create Privacy Settings Table
# =========================

def create_privacy_table():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS privacy_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            profile_private INTEGER DEFAULT 0,
            share_location INTEGER DEFAULT 1,
            data_collection INTEGER DEFAULT 1
        )
    """)

    conn.commit()
    conn.close()


create_privacy_table()



# =========================
# Create AI Monitoring Table
# =========================

def create_ai_monitoring_table():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_monitoring (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            status INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


create_ai_monitoring_table()


   
if __name__=="__main__":
    app.run(debug=False)

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5000, debug=False)
