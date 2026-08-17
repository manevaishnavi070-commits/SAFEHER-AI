
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


    // SOS voice
    function startVoiceSOS(){


    if (!('webkitSpeechRecognition' in window)) {

        alert("Voice Recognition is not supported in this browser.");

        return;
    }

    document.getElementById("voiceStatus").innerHTML="🎤Listening.... Please speak now.";

    let recognition = new webkitSpeechRecognition();

    recognition.lang = "en-US";

  
    recognition.start();

    recognition.onerror = function(event){
        
    }

    recognition.onend = function(){
     
    }

  
    recognition.onstart = function () {

};


    recognition.onresult = function(event){

        document.getElementById("voiceStatus").innerHTML="";

        let speech = event.results[0][0].transcript.toLowerCase();

        console.log("You Said:", speech);

        if(
            speech.includes("help") ||
            speech.includes("save me") ||
            speech.includes("danger") ||
            speech.includes("sos")
        ){

           let speechMessage = new SpeechSynthesisUtterance(
    "Emergency detected. Stay calm. Activating SafeHer protection."
);

speechSynthesis.speak(speechMessage);

startCountdown();

        }

        else{

            alert("Voice not recognized as emergency.");

        }

    };

}

// Safe route
let map;
let currentMarker;

let currentLat;
let currentLon;

let destinationLat;
let destinationLon;

let routingControl;

function getRouteLocation(){
    alert("Get location button clicked ");

navigator.geolocation.getCurrentPosition(function(position){

    currentLat = position.coords.latitude;
    currentLon = position.coords.longitude;


let output = document.getElementById("routeLocation");

output.innerHTML =
"Latitude: " + currentLat +
"<br>Longitude: " + currentLon;


if (!map) {

    map = L.map('map').setView([currentLat, currentLon], 15);

    L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    ).addTo(map);

} else {

    map.setView([currentLat, currentLon], 15);

    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

}
currentMarker = L.marker([currentLat,currentLon])
.addTo(map)
.bindPopup("Your current location")
.openPopup();


},
function (error){
    alert("location Error:" + error.message);
}
);

}


function showDestination() {
    if (!map) {
    alert("Please click Get My Location first.");
    return;
}   

    let destination = document.getElementById("destination").value;

    if (destination == "") {
        alert("Please enter destination");
        return;
    }

    fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + destination)

    .then(response => response.json())

    .then(data => {

        console.log(data);

        if (data.length == 0) {
            alert("Location not found");
            return;
        }

      destinationLat = parseFloat(data[0].lat);
      destinationLon = parseFloat(data[0].lon); 

        L.marker([destinationLat, destinationLon])
        .addTo(map)
        .bindPopup(destination)
        .openPopup();

        map.setView([destinationLat, destinationLon], 13);

        if (routingControl) {
     map.removeControl(routingControl);
}

      routingControl = L.Routing.control({
     waypoints: [
        L.latLng(currentLat, currentLon),
        L.latLng(destinationLat, destinationLon)
],
     lineOptions: {
        styles: [{ color: "blue", weight: 6 }]
},
     routeWhileDragging: false,
     createMarker: function () {
        return null;
    }
}).addTo(map);

    });

}

routingControl.on('routesfound', function(e) {

    let route = e.routes[0];

    let distance = (route.summary.totalDistance / 1000).toFixed(2);

    let time = Math.round(route.summary.totalTime / 60);

    document.getElementById("routeInfo").innerHTML =
        "📏 Distance: " + distance + " km" +
        "<br>⏱️ Estimated Time: " + time + " min";

});

let route = e.routes[0];

let distance = (route.summary.totalDistance/1000).toFixed(1);

let time = Math.round(route.summary.totalTime/60);

document.getElementById("routeInfo").innerHTML =
"📍 Destination : " + destination +
"<br>📏 Distance : " + distance + " km" +
"<br>⏱ Estimated Time : " + time + " min";
