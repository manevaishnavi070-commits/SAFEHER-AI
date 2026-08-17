function startCountdown(){

    let time= 10;

    let countdown = document.getElementById("countdown");


    let timer = setInterval(function(){


        countdown.innerHTML = 
        "SOS will activate in " + time + " seconds";


        time--;


        if(time < 0){

            clearInterval(timer);

            document.getElementById("sosForm").submit();

        }


    },1000);


}



function getLocation(){

    let locationText = document.getElementById("location");


    if(navigator.geolocation){

        navigator.geolocation.getCurrentPosition(function(position){

            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;


            locationText.innerHTML =
            "Latitude: " + latitude +
            "<br>Longitude: " + longitude;

            fetch("/save_location",{

    method:"POST",

    headers:{
        "Content-Type":"application/json"
    },

    body:JSON.stringify({

        latitude:latitude,
        longitude:longitude

    })
})
.then(response => response.text())
.then(data => {

    console.log(data);

    alert("opening google map");

    window.open(
        "https://www.google.com/maps?q=" + latitude + "," + longitude,
        "_blank"
    );

});
        });

    }

    else{

        locationText.innerHTML =
        "Location not supported";

    }

}

function checkBattery(){

    let batteryText = document.getElementById("battery");

    if (!batteryText){
        alert("Battery element not found");
        return;
    }


    if(navigator.getBattery){

        navigator.getBattery().then(function(battery){


            let level = Math.round(battery.level * 100);

            batteryText.innerHTML =
            "Battery Level: " + level + "%";


            if(level <= 20){


                batteryText.innerHTML +=
                "<br>⚠️ Low Battery!";


                fetch("/battery_alert",{

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify({

                        battery: level

                    })

                });


            }


        });


    }

    else{

        batteryText.innerHTML =
        "Battery information not supported";

    }

}




    function startSmartCountdown(){

    let time = 10;

    let display = document.getElementById("smartCountdown");


    let timer = setInterval(function(){

        display.innerHTML =
        "Action starts in " + time + " seconds";

        time--;


        if(time < 0){

            clearInterval(timer);

            display.innerHTML =
            "Countdown Completed";

        }

    },1000);

}

    function openProfileMenu(){
        // alert("profile Clicked");

        let menu =
        document.getElementById("profileMenu");

        menu.classList.toggle("active");
    }

// SOS Voice
function startVoiceSOS() {

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    document.getElementById("voiceStatus").innerHTML =
        "🎤 Listening... Please say HELP";

    recognition.start();

    recognition.onstart = function () {
        console.log("Listening started...");
    };

    recognition.onresult = function (event) {

        let speech = event.results[0][0].transcript.toLowerCase();

        console.log("You said:", speech);

        document.getElementById("voiceStatus").innerHTML =
            "You said: " + speech;

        if (
            speech.includes("help") ||
            speech.includes("save me") ||
            speech.includes("danger") ||
            speech.includes("sos")
        ) {

            let speechMessage = new SpeechSynthesisUtterance(
                "Emergency detected. Stay calm. Activating SafeHer protection."
            );

            speechSynthesis.speak(speechMessage);

            startCountdown();

        } else {

            alert("Voice not recognized as an emergency.");

        }
    };

    recognition.onerror = function (event) {

        console.log("Speech Error:", event.error);

        document.getElementById("voiceStatus").innerHTML =
            "Error: " + event.error;
    };

    recognition.onend = function () {
        console.log("Voice recognition ended.");
    };
}


// =====================================================
// SAFEHER AI - SAFE ROUTE
// =====================================================

let map = null;
let currentMarker = null;
let destinationMarker = null;
let routingControl = null;

let currentLat = null;
let currentLon = null;
let liveMarker = null;

let destinationLat = null;
let destinationLon = null;

let liveWatchId = null;


// =====================================================
// GET MY LOCATION + START LIVE TRACKING
// =====================================================

function getRouteLocation() {

    if (!navigator.geolocation) {
        alert("❌ Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(position) {

            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;

            console.log("Latitude:", currentLat);
            console.log("Longitude:", currentLon);

            updateLocationText();

            initializeMap();

            updateCurrentMarker();

            saveLocation(currentLat, currentLon);

            // Start live tracking automatically
            startLiveTracking();

        },

        function(error) {

            if (error.code === error.PERMISSION_DENIED) {
                alert("❌ Location permission denied.");
            }
            else if (error.code === error.POSITION_UNAVAILABLE) {
                alert("❌ Location unavailable.");
            }
            else if (error.code === error.TIMEOUT) {
                alert("❌ Location request timed out.");
            }
            else {
                alert("❌ Unable to get your location.");
            }

        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );
}


// =====================================================
// LOCATION TEXT
// =====================================================

function updateLocationText() {

    let locationBox =
        document.getElementById("routeLocation");

    if (!locationBox) return;

    locationBox.innerHTML =
        "📍 Current Location<br>" +
        "Latitude : " + currentLat.toFixed(5) +
        "<br>" +
        "Longitude : " + currentLon.toFixed(5);

}


// =====================================================
// INITIALIZE MAP
// =====================================================

function initializeMap() {

    if (map !== null) {

        map.setView(
            [currentLat, currentLon],
            15
        );

        return;
    }

    map = L.map("map").setView(
        [currentLat, currentLon],
        15
    );


    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

}


// =====================================================
// CURRENT LOCATION MARKER
// =====================================================

function updateCurrentMarker() {

    if (!map) return;

    // First time → create marker
    if (!currentMarker) {

        currentMarker = L.marker([
            currentLat,
            currentLon
        ])
        .addTo(map)
        .bindPopup("📍 Your Current Location");

    }

    // Next updates → move existing marker
    else {

        currentMarker.setLatLng([
            currentLat,
            currentLon
        ]);

    }
}

// =====================================================
// SAVE LOCATION TO FLASK
// =====================================================

function saveLocation(latitude, longitude) {

    fetch("/save_location", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            latitude: latitude,
            longitude: longitude

        })

    })

    .then(response => response.json())

    .then(data => {

        console.log("Location:", data);

    })

    .catch(error => {

        console.log(
            "Save Location Error:",
            error
        );

    });

}


// =====================================================
// LIVE LOCATION TRACKING
// =====================================================

function startLiveTracking() {

    if (!navigator.geolocation) return;


    if (liveWatchId !== null) {

        navigator.geolocation.clearWatch(
            liveWatchId
        );

    }


    liveWatchId =
        navigator.geolocation.watchPosition(

            function(position) {

                currentLat =
                    position.coords.latitude;

                currentLon =
                    position.coords.longitude;


                console.log(
                    "Live Location:",
                    currentLat,
                    currentLon
                );


                updateLocationText();

                updateCurrentMarker();

                saveLocation(
                    currentLat,
                    currentLon
                );


                // Update remaining distance
                if (
                    destinationLat !== null &&
                    destinationLon !== null
                ) {

                    updateRemainingDistance();

                }

            },

            function(error) {

                console.log(
                    "Live Tracking Error:",
                    error
                );

            },

            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000
            }

        );

}


// =====================================================
// SHOW DESTINATION
// =====================================================

function showDestination() {

    let destinationInput =
        document.getElementById("destination");


    if (!destinationInput) {

        alert("Destination field not found.");
        return;

    }


    let destination =
        destinationInput.value.trim();


    if (destination === "") {

        alert("⚠️ Please enter destination.");
        return;

    }


    // Need current location
    if (
        currentLat === null ||
        currentLon === null
    ) {

        alert(
            "📍 First click 'Get My Location'."
        );

        return;

    }


    findDestination(destination);

}


// =====================================================
// FIND DESTINATION USING NOMINATIM
// =====================================================

function findDestination(destination) {

    let url =
        "https://nominatim.openstreetmap.org/search" +
        "?format=json" +
        "&limit=1" +
        "&q=" +
        encodeURIComponent(destination);


    fetch(url)

        .then(response => response.json())

        .then(data => {

            if (!data || data.length === 0) {

                alert(
                    "❌ Destination not found."
                );

                return;

            }


            destinationLat =
                parseFloat(data[0].lat);

            destinationLon =
                parseFloat(data[0].lon);


            console.log(
                "Destination:",
                destinationLat,
                destinationLon
            );


            drawDestination();

            createRoute(destination);

        })

        .catch(error => {

            console.log(
                "Destination Error:",
                error
            );

            alert(
                "❌ Unable to find destination."
            );

        });

}


// =====================================================
// DESTINATION MARKER
// =====================================================

function drawDestination() {

    if (!map) {

        initializeMap();

    }


    if (destinationMarker) {

        map.removeLayer(
            destinationMarker
        );

        destinationMarker = null;

    }


    destinationMarker =
        L.marker(
            [
                destinationLat,
                destinationLon
            ]
        )
        .addTo(map)
        .bindPopup("🎯 Destination")
        .openPopup();

}


// =====================================================
// CREATE REAL ROAD ROUTE
// =====================================================

function createRoute(destination) {

    if (!map) return;


    // Remove old route safely
    if (routingControl) {

        try {

            map.removeControl(
                routingControl
            );

        }

        catch (error) {

            console.log(
                "Old route remove error:",
                error
            );

        }

        routingControl = null;

    }


    routingControl =
        L.Routing.control({

            router:
                L.Routing.osrmv1({

                    serviceUrl:
                        "https://router.project-osrm.org/route/v1"

                }),


            waypoints: [

                L.latLng(
                    currentLat,
                    currentLon
                ),

                L.latLng(
                    destinationLat,
                    destinationLon
                )

            ],


            addWaypoints: false,

            draggableWaypoints: false,

            routeWhileDragging: false,

            fitSelectedRoutes: true,

            show: false,


            lineOptions: {

                styles: [

                    {
                        color: "#7C3AED",
                        weight: 7,
                        opacity: 0.9
                    }

                ]

            },


            createMarker: function() {

                return null;

            }

        })
        .addTo(map);


    routingControl.on(
        "routingerror",
        function(error) {

            console.log(
                "Routing Error:",
                error
            );

            alert(
                "❌ Route could not be calculated."
            );

        }
    );


    routingControl.on(
        "routesfound",
        function(event) {

            let route =
                event.routes[0];


            let distance =
                route.summary.totalDistance /
                1000;


            let time =
                Math.round(
                    route.summary.totalTime /
                    60
                );


            updateRouteInfo(
                destination,
                distance,
                time
            );


            updateSafetyScore(
                distance
            );


            document.getElementById(
                "remainingDistance"
            ).innerHTML =
                distance.toFixed(2) +
                " km";


            document.getElementById(
                "remainingTime"
            ).innerHTML =
                time +
                " min";

        }
    );

}


// =====================================================
// ROUTE INFORMATION
// =====================================================

function updateRouteInfo(
    destination,
    distance,
    time
) {

    let routeInfo =
        document.getElementById(
            "routeInfo"
        );


    if (!routeInfo) return;


    routeInfo.innerHTML =

        "📍 Start : Live Location" +

        "<br>🎯 Destination : " +
        destination +

        "<br>📏 Distance : " +
        distance.toFixed(2) +
        " km" +

        "<br>⏱ Estimated Time : " +
        time +
        " min";

}


// =====================================================
// LIVE REMAINING DISTANCE
// =====================================================

function updateRemainingDistance() {

    let distance =
        calculateDistance(

            currentLat,
            currentLon,

            destinationLat,
            destinationLon

        );


    let distanceElement =
        document.getElementById(
            "remainingDistance"
        );


    if (distanceElement) {

        distanceElement.innerHTML =
            distance.toFixed(2) +
            " km";

    }


    let progressText =
        document.getElementById(
            "progressText"
        );


    if (progressText) {

        progressText.innerHTML =
            "📍 Live Tracking • " +
            distance.toFixed(2) +
            " km remaining";

    }


    // Destination reached
    if (distance < 0.1) {

        if (progressText) {

            progressText.innerHTML =
                "🎉 Destination Reached";

        }


        let journeyText =
            document.getElementById(
                "journeyText"
            );


        if (journeyText) {

            journeyText.innerHTML =
                "🏁 Destination Reached";

        }

    }

}


// =====================================================
// DISTANCE CALCULATION
// =====================================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    let R = 6371;


    let dLat =
        (lat2 - lat1) *
        Math.PI / 180;


    let dLon =
        (lon2 - lon1) *
        Math.PI / 180;


    let a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

        +

        Math.cos(
            lat1 * Math.PI / 180
        ) *

        Math.cos(
            lat2 * Math.PI / 180
        ) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);


    let c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


// =====================================================
// AI SAFETY SCORE
// =====================================================

function updateSafetyScore(distance) {

    let score;


    if (distance <= 5) {

        score = 95;

    }
    else if (distance <= 15) {

        score = 80;

    }
    else {

        score = 70;

    }


    let scoreElement =
        document.getElementById(
            "safetyScore"
        );


    let riskElement =
        document.getElementById(
            "riskLevel"
        );


    let safetyBox =
        document.getElementById(
            "safetyStatus"
        );


    if (scoreElement) {

        scoreElement.innerHTML =
            score + "%";

    }


    if (score >= 90) {

        if (riskElement) {

            riskElement.innerHTML =
                "🟢 Safe Route";

        }


        if (safetyBox) {

            safetyBox.className =
                "safety-status safe";

            safetyBox.innerHTML =
                "🟢 AI Safety Status<br><br>" +
                "This route appears safe.";

        }

    }

    else if (score >= 70) {

        if (riskElement) {

            riskElement.innerHTML =
                "🟡 Moderate Risk";

        }


        if (safetyBox) {

            safetyBox.className =
                "safety-status";

            safetyBox.innerHTML =
                "🟡 AI Safety Status<br><br>" +
                "Stay alert while travelling.";

        }

    }

    else {

        if (riskElement) {

            riskElement.innerHTML =
                "🔴 High Risk";

        }


        if (safetyBox) {

            safetyBox.className =
                "safety-status danger";

            safetyBox.innerHTML =
                "🔴 AI Warning<br><br>" +
                "Please stay alert.";

        }

    }

}


// =====================================================
// NEARBY POLICE
// =====================================================

function findNearbyPolice() {

    if (
        currentLat === null ||
        currentLon === null
    ) {

        alert(
            "📍 First click Get My Location."
        );

        return;

    }


    let url =
        "https://www.google.com/maps/search/" +
        "police+station/@" +
        currentLat +
        "," +
        currentLon +
        ",15z";


    window.open(
        url,
        "_blank"
    );

}


// =====================================================
// NEARBY HOSPITAL
// =====================================================

function findNearbyHospital() {

    if (
        currentLat === null ||
        currentLon === null
    ) {

        alert(
            "📍 First click Get My Location."
        );

        return;

    }


    let url =
        "https://www.google.com/maps/search/" +
        "hospital/@" +
        currentLat +
        "," +
        currentLon +
        ",15z";


    window.open(
        url,
        "_blank"
    );

}


// =====================================================
// CALL POLICE
// =====================================================

function callPolice() {

    alert(
        "📞 Calling Police (112)"
    );

    window.location.href =
        "tel:112";

}


// =====================================================
// CALL GUARDIAN
// =====================================================

function callGuardian() {

    alert(
        "📞 Calling Guardian"
    );

    window.location.href =
        "tel:9876543210";

}


// =====================================================
// QUICK SOS
// =====================================================

function sendQuickSOS() {

    fetch(
        "/send_sos",
        {
            method: "POST"
        }
    )

    .then(function(response) {

        if (response.ok) {

            alert(
                "🚨 SOS Sent Successfully!"
            );

        }
        else {

            alert(
                "❌ Failed to send SOS."
            );

        }

    })

    .catch(function(error) {

        console.log(
            "SOS Error:",
            error
        );

        alert(
            "❌ Error sending SOS."
        );

    });

}


// =====================================================
// SHARE LOCATION
// =====================================================

function shareLocation() {

    if (!navigator.geolocation) {

        alert(
            "❌ Geolocation not supported."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        function(position) {

            let lat =
                position.coords.latitude;

            let lng =
                position.coords.longitude;


            let message =
                "My current location:\n" +
                "https://www.google.com/maps?q=" +
                lat +
                "," +
                lng;


            if (
                navigator.share &&
                navigator.userActivation &&
                navigator.userActivation.isActive
            ) {

                navigator.share({

                    title:
                        "SafeHer AI Location",

                    text:
                        message

                })

                .catch(function(error) {

                    console.log(
                        "Share Error:",
                        error
                    );

                });

            }

            else {

                navigator.clipboard
                    .writeText(message)

                    .then(function() {

                        alert(
                            "📍 Location link copied!"
                        );

                    })

                    .catch(function() {

                        alert(message);

                    });

            }

        },

        function() {

            alert(
                "❌ Unable to get location."
            );

        }

    );

}

// =====================================================
// JOURNEY CONTROL
// =====================================================

let journeyActive = false;


// =====================================================
// START JOURNEY
// =====================================================

function startJourney() {

    // Route check
    if (destinationLat === null || destinationLon === null) {

        alert("⚠️ Please show the Safe Route first.");
        return;

    }

    journeyActive = true;

    let journeyText =
        document.getElementById("journeyText");

    let progressText =
        document.getElementById("progressText");


    if (journeyText) {

        journeyText.innerHTML =
            "🚗 Journey Started";

    }


    if (progressText) {

        progressText.innerHTML =
            "🟢 Journey active • Live tracking started";

    }


    let startButton =
        document.querySelector(".start-journey-btn");

    let endButton =
        document.querySelector(".end-journey-btn");


    if (startButton) {

        startButton.disabled = true;

    }


    if (endButton) {

        endButton.disabled = false;

    }


    // Start live location
    startLiveTracking();


    // Start AI Monitoring
    startAIFromJourney();

}
// =====================================================
// END JOURNEY
// =====================================================
function endJourney() {

    journeyActive = false;


    // Stop live tracking
    stopLiveTracking();


    let journeyText =
        document.getElementById("journeyText");

    let progressText =
        document.getElementById("progressText");


    if (journeyText) {

        journeyText.innerHTML =
            "🏁 Journey Ended";

    }


    if (progressText) {

        progressText.innerHTML =
            "Journey completed • Tracking stopped";

    }


    let startButton =
        document.querySelector(".start-journey-btn");

    let endButton =
        document.querySelector(".end-journey-btn");


    if (startButton) {

        startButton.disabled = false;

    }


    if (endButton) {

        endButton.disabled = true;

    }


    // Stop AI Monitoring
    stopAIFromJourney();

}

// =====================================================
// STOP LIVE TRACKING
// =====================================================

function stopLiveTracking() {

    if (liveWatchId !== null) {

        navigator.geolocation.clearWatch(
            liveWatchId
        );

        liveWatchId = null;

    }

}


// =====================================================
// BATTERY
// =====================================================

function checkBattery() {

    let batteryText =
        document.getElementById(
            "battery"
        );


    if (!batteryText) return;


    if (!navigator.getBattery) {

        batteryText.innerHTML =
            "Battery information not supported.";

        return;

    }


    navigator.getBattery()

        .then(function(battery) {

            let level =
                Math.round(
                    battery.level * 100
                );


            batteryText.innerHTML =
                "Battery Level: " +
                level +
                "%";


            if (level <= 20) {

                batteryText.innerHTML +=
                    "<br>⚠️ Low Battery!";

            }

        })

        .catch(function(error) {

            console.log(
                "Battery Error:",
                error
            );

        });

}


// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
    "load",
    function() {

        checkBattery();

    }
);
