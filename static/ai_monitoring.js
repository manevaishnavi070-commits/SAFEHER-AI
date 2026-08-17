// =====================================================
// TOGGLE AI MONITORING FROM DASHBOARD
// =====================================================

async function toggleAI() {

    try {

        let response = await fetch("/toggle_ai", {
            method: "POST"
        });

        let data = await response.json();

        let status =
            document.getElementById("aiStatus");

        let button =
            document.getElementById("aiButton");

        if (data.status == 1) {

            monitoring = true;

            if (status) {
                status.innerHTML = "🟢 Status : ON";
            }

            if (button) {
                button.innerHTML = "Turn OFF";
            }

            startMonitoring();

            console.log(
                "🤖 AI Monitoring ON from Dashboard"
            );

        }

        else {

            monitoring = false;

            if (status) {
                status.innerHTML = "🔴 Status : OFF";
            }

            if (button) {
                button.innerHTML = "Turn ON";
            }

            stopMonitoring();

            console.log(
                "🤖 AI Monitoring OFF from Dashboard"
            );

        }

    }

    catch (error) {

        console.log(
            "AI Monitoring Error:",
            error
        );

    }

}

// =====================================================
// AI MONITORING ENGINE
// =====================================================

let monitorTimer = null;
let reminderTimer = null;
let responseTimeout = null;

let monitoring = false;

let recognition = null;


// =====================================================
// START MONITORING
// =====================================================

function startMonitoring() {

    stopMonitoring();

    if (!monitoring) {
        return;
    }

    console.log("🤖 AI Monitoring Started");

    monitorTimer = setTimeout(function () {

        askSafety();

    }, 10000);   // TESTING: 10 seconds
}


// =====================================================
// STOP MONITORING
// =====================================================

function stopMonitoring() {

    clearTimeout(monitorTimer);
    clearTimeout(reminderTimer);
    clearTimeout(responseTimeout);

    if (recognition) {

        try {
            recognition.stop();
        } catch (e) {}

    }

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
}


// =====================================================
// ASK SAFETY
// =====================================================

function askSafety() {

    if (!monitoring) {
        return;
    }

    let popup =
        document.getElementById("safetyPopup");

    if (popup) {
        popup.classList.add("show");
    }

    let speech =
        new SpeechSynthesisUtterance("Are you safe?");

    speech.lang = "en-US";

    speech.onend = function () {

        startListening();

    };

    speechSynthesis.speak(speech);

    responseTimeout =
        setTimeout(reminder, 15000);
}


// =====================================================
// REMINDER
// =====================================================

function reminder() {

    if (!monitoring) {
        return;
    }

    speechSynthesis.cancel();

    let speech =
        new SpeechSynthesisUtterance(
            "I didn't get your response. Are you safe?"
        );

    speech.lang = "en-US";

    speechSynthesis.speak(speech);

    reminderTimer =
        setTimeout(autoSOS, 15000);
}


// =====================================================
// I'M SAFE
// =====================================================

function iAmSafe() {

    clearTimeout(responseTimeout);
    clearTimeout(reminderTimer);

    speechSynthesis.cancel();

    let popup =
        document.getElementById("safetyPopup");

    if (popup) {
        popup.classList.remove("show");
    }

    startMonitoring();
}


// =====================================================
// NEED HELP
// =====================================================

async function needHelp() {

    clearTimeout(responseTimeout);
    clearTimeout(reminderTimer);

    speechSynthesis.cancel();

    let popup =
        document.getElementById("safetyPopup");

    if (popup) {
        popup.classList.remove("show");
    }

    await fetch("/send_sos", {
        method: "POST"
    });

    alert("🚨 SOS Sent");

    monitoring = false;

    stopMonitoring();
}


// =====================================================
// AUTO SOS
// =====================================================

async function autoSOS() {

    let popup =
        document.getElementById("safetyPopup");

    if (popup) {
        popup.classList.remove("show");
    }

    await fetch("/send_sos", {
        method: "POST"
    });

    alert(
        "🚨 No Response.\nAutomatic SOS Sent."
    );

    monitoring = false;

    stopMonitoring();
}


// =====================================================
// VOICE LISTENING
// =====================================================

function startListening() {

    if (!("webkitSpeechRecognition" in window)) {

        console.log(
            "Speech Recognition not supported."
        );

        return;
    }

    recognition =
        new webkitSpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onresult = function (event) {

        let text =
            event.results[0][0]
                .transcript
                .toLowerCase();

        console.log(
            "🎙️ User said:",
            text
        );


        if (
            text.includes("safe") ||
            text.includes("yes") ||
            text.includes("i am safe")
        ) {

             iAmSafe();

         }
        else if (
            text.includes("help") ||
            text.includes("not safe") ||
            text.includes("danger") ||
            text.includes("i need help")
        ) {

            needHelp();

        }

    };


    recognition.onerror = function (event) {

        console.log(
            "Speech recognition error:",
            event.error
        );

    };


    try {

        recognition.start();

    }

    catch (error) {

        console.log(
            "Recognition start error:",
            error
        );

    }
}



// =====================================================
// START AI FROM SAFE ROUTE
// =====================================================

async function startAIFromJourney() {

    try {

        let response = await fetch("/start_ai", {
            method: "POST"
        });

        let data = await response.json();

        if (data.status == 1) {

            monitoring = true;

            console.log("🤖 AI Monitoring ON from Safe Route");

            startMonitoring();

        } else {

            console.log("⚠️ AI Monitoring could not start");

        }

    } catch (error) {

        console.log("AI Start Error:", error);

    }
}


// =====================================================
// STOP AI FROM SAFE ROUTE
// =====================================================

async function stopAIFromJourney() {

    try {

        let response = await fetch("/stop_ai", {
            method: "POST"
        });

        let data = await response.json();

        if (data.status == 0) {

            monitoring = false;

            console.log("🤖 AI Monitoring OFF from Safe Route");

            stopMonitoring();

        }

    } catch (error) {

        console.log("AI Stop Error:", error);

    }
}


