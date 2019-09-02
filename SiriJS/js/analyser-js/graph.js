let audioContext;

// nodes
let micNode;         // MediaStreamSource node for using microphone audio
let scriptNode;      // ScriptProcessor node for getting raw audio data
let analyserNode;    // Analyser node from WEB Audio API

// canvas and context
let canvasArray = [];
let contextArray = [];

let analyser = new Analyser({
    fftSize: 1024 
});

let isRunning = false; // if media stream is running

window.onload = function () {

    // get all the canvas and context
    for (let i = 1; i <= 2; i++) {

        let canvasDOM = document.getElementById("canvas" + i);
        canvasDOM.width = window.innerWidth / 2;
        canvasDOM.height = 130;

        let context = canvasDOM.getContext("2d");
        canvasArray.push(canvasDOM);
        contextArray.push(context);
    }
};


// initialize audio context and nodes
function init() {

    // stop
    if (audioContext != undefined) {

        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;

        audioContext.close();
        audioContext = undefined;

        document.getElementById("button").style.backgroundColor = "rgb(224, 52, 52)";
        return;
    }

    audioContext = new AudioContext();

    // ask user for microphone permission
    if (navigator.mediaDevices.getUserMedia) {

        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (stream) {

            // create media stream node
            micNode = audioContext.createMediaStreamSource(stream);

            // create script processor node
            scriptNode = audioContext.createScriptProcessor(analyser.fftSize, 1, 1);
            scriptNode.onaudioprocess = process;
            scriptNode.connect(audioContext.destination);
            micNode.connect(scriptNode);

            // create analyser node
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = analyser.fftSize;
            micNode.connect(analyserNode);

            document.getElementById("button").style.backgroundColor = "rgb(128, 255, 78)";


        }).catch(function (err) {
            throw 'Error capturing audio.';
        });
    }
};



let buffer = null;
let animationFrameId;
function process(e) {
    buffer = e.inputBuffer.getChannelData(0); // mono - 1 channel 

    if (animationFrameId == undefined) {
        animationFrameId = requestAnimationFrame(update);  // request graph update
    }
}


// update graphs
function update() {

    let canvas;
    let context;
    let fftSize = analyser.fftSize;
 
    // canvas1
    // Using Analyser Class
    canvas = canvasArray[0];
    context = contextArray[0];
    context.clearRect(0, 0, canvas.width, canvas.height);

    // get the byte data
    let frequencyData = analyser.getByteFrequencyData(buffer);
 
    let x = 0;
    let barHeight;
    let barWidth = (canvas.width / fftSize) * 2.5;
    for (let i = 0; i < fftSize; i++) {

        barHeight = frequencyData[i] - 40;
        context.fillStyle = 'rgb( 211,245,' + (barHeight + 120) + ')';
        context.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
    context.fillStyle = "white";
    context.fillText("Using Analyser Class", 10, 20);



    // canvas2
    // using Web Audio API`s analyser node
    canvas = canvasArray[1];
    context = contextArray[1];
    context.clearRect(0, 0, canvas.width, canvas.height);

    // get byte data
    frequencyData = new Uint8Array(analyserNode.fftSize / 2);
    analyserNode.getByteFrequencyData(frequencyData);

    x = 0;
    barHeight = 0;
    barWidth = (canvas.width / fftSize) * 2.5;
    for (let i = 0; i < fftSize; i++) {

        barHeight = frequencyData[i] - 40;
        context.fillStyle = 'rgb( 211,245,' + (barHeight + 120) + ')';
        context.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
    context.fillStyle = "white";
    context.fillText("Using Web Audio API`s analyser node", 10, 20);

    
    animationFrameId = requestAnimationFrame(update); // request graph update
}