/* 
 * Free iOS-Siri Drawer (JavaScript)
 * 
 * 
 * Copyright (c) 2019 Stanislav Georgiev. (MIT License)
 * https://github.com/slaviboy
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 * 
 *  First try of creting SIRI like curves, that are generated using
 *  audio input (microphone), frequecies.
 */


// frequency analyser
const analyser = new Analyser({
    fftSize: 2048,
    smoothingTimeConstant: 0.6      // used for changing transitional speed
});

// frequencies for the range
let frequencies = [
    500,
    1000,
    2000,
    4000,
    6000
];

// colors for the range
let colors = [
    "#2B4DDC",
    "#FF518B",
    "#7BFFCB",
    "#F6FFA4"
];

// curves paddaing
let padding = {
    left: 22,
    right: 22
};

let audioContext;                   // audio context
let micNode;                        // media stream node
let canvas;                         // canvas
let context;                        // context for the canvas
let backgroundGradient;             // gradient for the background
let lineGradient;                   // gradient for the middle line betweenn top and bottom curves
let buffer = null;                  // audio buffer from microphone
let animationFrameId;               // current frame id for the animation
let blurRadius = 5;                 // blur radius for the glowing underlayer
let sensitivity = 0.3;              // peaks sensitivity
let increasePeaks = -20;            // increase all peaks by (px)
let curveTop;                       // top curve
let curveBottom;                    // botom curve
let frequencyIndexes = [];          // fft indexes coressponding to range frequencies
let offsets = [];                   // random curves offset for each range
let numPeaks = [];                  // number of peaks for each range

/**
 * Init canvas and other objects, when window is loaded
 */
window.onload = function () {

    // get canvas and context 
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    // set canvas size
    let canvasWidth = 290;
    let canvasRatio = 2;
    canvas.width = canvasWidth;
    canvas.height = (canvasWidth * canvasRatio) | 0;

    // background image
    let bg = document.getElementById("background");
    bg.style.width = canvasWidth + 'px';
    bg.style.height = 'auto';

    let phone = document.getElementById("phone");
    phone.style.width = bg.style.width;
    phone.style.height = bg.style.height;

    let button = document.getElementById("button");
    button.style.width = '70px';
    button.style.height = '70px';


    // set padding, that is in ratio with the canvas width
    let paddingAll = canvasWidth / 5;
    padding = {
        left: paddingAll,
        right: paddingAll
    };

    // get frequency indexes from coressponding to frequency
    for (let i = 0; i < frequencies.length; i++) {
        frequencyIndexes[i] = findIndex(frequencies[i]);
    }

    // generate random offset and number of peaks for each range
    for (let i = 0; i < frequencies.length - 1; i++) {
        offsets[i] = Math.random() * 30 + 1;
        numPeaks[i] = Math.floor(Math.random() * 2 + 2);
    }

    // top curve object
    curveTop = new Curve({
        context: context,
        isStroked: false,
        type: Curve.TYPE_QUADRATIC_CURVE
    });

    // bottom curve object
    curveBottom = new Curve({
        context: context,
        isStroked: false,
        type: Curve.TYPE_QUADRATIC_CURVE
    });

    // background color
    backgroundGradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        5,
        canvas.width / 2,
        canvas.height / 2,
        100);
    backgroundGradient.addColorStop(0, "#181818");
    backgroundGradient.addColorStop(1, "#181818");


    // middle line color
    lineGradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvasWidth / 2 - paddingAll + 14);
    lineGradient.addColorStop(0, "#ffffff");
    lineGradient.addColorStop(1, "#ffffff00");
};

// preload font
document.fonts.load('10pt "Kozuka"').then(function () {
    draw();
});

/**
 * Initialize audio context and nodes on start button click,
 * and stop animation for stop click.
 */
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

/**
 * Method that is called when the processor node, have procced audio
 * data from the microphone
 * 
 * @param {Event} e 
 */
function process(e) {

    // get buffer (mono, 1 channel)
    buffer = e.inputBuffer.getChannelData(0);

    // request graph redraw
    if (animationFrameId == undefined) {
        animationFrameId = requestAnimationFrame(draw);
    }
}

/**
 * Method that redraws the whole canvas with the background, middle line,
 * curves, and label.
 */
function draw() {

    drawBackground();

    // translate canvas to move the curves,  default position is center
    context.save();
    context.translate(0, 190);

    drawMiddleLine();
    drawCurves();

    context.restore();

    let halfWidth = (canvas.width / 2) | 0;
    let halfHeight = (canvas.height / 2) | 0;
    drawLabel("made by", 20, "#424242", halfWidth + 2, halfHeight - 35);
    drawLabel("Slaviboy", 42, "#232323", halfWidth, halfHeight);

    // request graph update
    animationFrameId = requestAnimationFrame(draw);
}

function drawCurves() {

    // make sure buffer set
    if (buffer == null) {
        return;
    }

    // draw curves for each frequency range
    for (let i = 0; i < 4; i++) {
        drawCurve(i);
    }
}

function drawMiddleLine() {

    // draw middle line
    context.fillStyle = lineGradient;
    context.fillRect(0, canvas.height / 2, canvas.width, 1);
}

function drawBackground() {

    // draw background
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = backgroundGradient;
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawLabel(text, size, color, x, y) {

    // draw label 
    context.globalAlpha = 1;
    context.textAlign = "center";
    context.font = size + "px Kozuka";
    context.fillStyle = color;
    context.fillText(text, x, y);
}

/**
 * Method that redraws curves on canvas, with the new frequency byte
 * data given the analyser object.
 * 
 * @param {Integer} rangeIndex range index
 */
function drawCurve(rangeIndex) {

    let frequencyData = analyser.getByteFrequencyData(buffer);      // get frequency data as byte array
    let color = colors[rangeIndex];                                 // curve color
    let startIndex = frequencyIndexes[rangeIndex];                  // start frequency index
    let endIndex = frequencyIndexes[rangeIndex + 1];                // end frequency index
    let totalPeaks = endIndex - startIndex;                         // total peaks in range
    let allowedPeaks = Math.min(numPeaks[rangeIndex], totalPeaks);  // number of allowed peaks for curve
    let skipPeaks = totalPeaks / allowedPeaks;                      // how many peaks to skip to fit the subrange
    let minPeakHeight = 1;                                          // minimum peak height, that when reached generates new random offset and number of peaks
    let maxPeaks = [];                                              // the maximum peaks for the sub-ranges
    let maxPeaksIndex = [];                                         // the maximum peaks index, dictates the peaks location


    // set peaks indexes
    let count = 0;
    for (let i = 0; i < (allowedPeaks + 1) * 2; i++) {
        if (i % 2 == 0) {

            // index for the sub-ranges enclosing points, with value of 0
            maxPeaks[i] = 0;
            maxPeaksIndex[i] = (startIndex + count * skipPeaks) | 0;

            // index for the peaks points
            maxPeaksIndex[i + 1] = maxPeaksIndex[i] + (skipPeaks / 2) | 0;

            count++;
        }
    }

    // find the maximum frequency value in the sub-range
    for (let i = 0; i < allowedPeaks; i++) {

        // indexes for the enclosing points in the sub-range
        let start = (startIndex + i * skipPeaks) | 0;
        let end = (start + skipPeaks) | 0;

        let index = i * 2 + 1;
        maxPeaks[index] = 0;

        // maximum frequency in the subrange
        for (let j = start; j < end; j++) {
            let barHeight = increasePeaks + frequencyData[j] * sensitivity;
            if (barHeight > 1 && barHeight > maxPeaks[index]) {
                maxPeaks[index] = barHeight;
            }
        }
    }

    let sum = 0;
    let allowedWidth = canvas.width - (padding.left + padding.right + offsets[rangeIndex]);

    // set top curve points
    curveTop.clear();
    curveTop.fill = color;
    for (let i = 0; i < maxPeaks.length; i++) {
        let index = maxPeaksIndex[i] - startIndex;
        let fact = index / totalPeaks;
        let x = offsets[rangeIndex] + padding.left + allowedWidth * fact;
        let y = (canvas.height - maxPeaks[i]) / 2;
        curveTop.add(x, y + 1);

        sum += maxPeaks[i];
    }

    // set bottom curve points
    curveBottom.clear();
    curveBottom.fill = color;
    for (let i = 0; i < maxPeaks.length; i++) {
        let index = maxPeaksIndex[i] - startIndex;
        let fact = index / totalPeaks;
        let x = offsets[rangeIndex] + padding.left + allowedWidth * fact;
        let y = (canvas.height + maxPeaks[i]) / 2;
        curveBottom.add(x, y);
    }


    // draw curves
    if (sum < minPeakHeight * maxPeaksIndex.length) {

        // if min peak height is reached for all peaks, generate new random values
        offsets[rangeIndex] = Math.random() * 25;
        numPeaks[rangeIndex] = Math.floor(Math.random() * 2 + 2);
    } else {

        // draw blur curves beneath
        context.filter = "blur(" + blurRadius + "px)";
        context.globalAlpha = 0.4;
        context.globalCompositeOperation = 'lighter';
        curveTop.draw();
        curveBottom.draw();

        // draw solids curves
        context.filter = "blur(0px)";
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'screen';
        curveTop.draw();
        curveBottom.draw();
    }
}

/**
 * Method that generates random hex color
 */
function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * Method that find the corresponding fft index to a frequency
 * @param {Float} frequency 
 */
function findIndex(frequency) {
    let fact = analyser.sampleRate / analyser.fftSize;
    let index = (frequency / fact) | 0;
    return index;
}