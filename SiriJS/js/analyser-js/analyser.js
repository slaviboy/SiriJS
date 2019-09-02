/* 
 * Free Frequency Analyser (JavaScript)
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
 *   Based on Web Audio API Documentation https://www.w3.org/TR/webaudio/#fft-windowing-and-smoothing-over-time
 */

class Analyser {

    constructor(args = {}) {

        // default values
        this.args = Object.assign({
            fftSize: 512,
            minDecibels: -100,
            maxDecibels: -30,
            sampleRate: 44100,
            windowType: 'blackman',
            smoothingTimeConstant: 0.8
        }, args);

        // values used in real time calculation
        // (no need for getter/setter)
        this.minDecibels = this.args.minDecibels;
        this.maxDecibels = this.args.maxDecibels;
        this.smoothingTimeConstant = this.args.smoothingTimeConstant;

        // smoothed data array
        this.smoothing = [];
        for (let i = 0; i < this.fftSize / 2; i++) {
            this.smoothing[i] = 0.0;  // default values
        }

        // window array 
        this.setWindow(this.args.windowType);

        // frequency array
        this.setFrequency();
    }

    // half the FFT size.
    get frequencyBinCount() {
        return this.fftSize / 2;
    }

    get fftSize() {
        return this.args.fftSize;
    }

    set fftSize(value) {
        this.args.fftSize = value;

        // update window
        this.setWindow(this.args.windowType);

        // update frequency
        this.setFrequency();
    }


    get sampleRate() {
        return this.args.sampleRate;
    }

    set sampleRate(value) {
        this.args.sampleRate = value;

        // update frequency
        this.setFrequency();
    }


    get windowType() {
        return this.args.windowType;
    }

    set windowType(value) {
        this.args.windowType = windowType;

        // update window
        this.setWindow(this.args.windowType);
    }

    /**
     * Get frequency as float array
     * @param {Float32Array} floatTimeDomainData 
     * @return {Float32Array} floatFrequencyData
     */
    getFloatFrequencyData(floatTimeDomainData) {

        // set real and imaginary arrays 
        let realArray = [];
        let imaginaryArray = [];
        for (let i = 0; i < this.fftSize; i++) {
            imaginaryArray[i] = 0.0;
            realArray[i] = floatTimeDomainData[i] * this.window[i];
        }

        // applying a Blackman window
        for (let i = 0; i < this.fftSize; i++) {
            //realArray[i] *= this.window[i];
        }

        // apply fft
        transform(realArray, imaginaryArray);

        // get magnitude
        let magnitude = [];
        for (let i = 0; i < this.fftSize / 2; i++) {
            let re = realArray[i];
            let im = imaginaryArray[i];
            magnitude[i] = Math.sqrt(re * re + im * im) / (this.fftSize);
        }

        // smoothing over time 
        for (let i = 0; i < this.fftSize / 2; i++) {
            this.smoothing[i] =
                this.smoothingTimeConstant * this.smoothing[i] +
                (1 - this.smoothingTimeConstant) * magnitude[i];
        }

        // Convert to dB magnitude 
        let floatFrequencyData = new Float32Array(this.fftSize / 2);
        for (let i = 0; i < this.fftSize / 2; i++) {
            floatFrequencyData[i] = 20 * Math.log10(this.smoothing[i]);
        }

        return floatFrequencyData;
    }

    /**
     * Get frequency data as unsigned byte array [0-255]
     * @param {Float32Array} floatTimeDomainData 
     * @returns {Uint8Array} byteFrequencyData
     */
    getByteFrequencyData(floatTimeDomainData) {

        // get frequency data as float array
        let floatFrequencyData = this.getFloatFrequencyData(floatTimeDomainData);
        let arraySize = floatFrequencyData.length;
        let byteFrequencyData = new Uint8Array(arraySize);

        // clip data between [0-255]
        for (let i = 0; i < arraySize; i++) {
            let byteValue = (255 / (this.maxDecibels - this.minDecibels))
                * (floatFrequencyData[i] - this.minDecibels);

            // !!! clip before set as value to Uint8Array
            if (byteValue > 255) {
                byteValue = 255;
            }
            else if (byteValue < 0) {
                byteValue = 0;
            }

            byteFrequencyData[i] = byteValue;
        }

        return byteFrequencyData;
    }


    /**
     * Set window, by string name
     * @param {String} windowType 
     */
    setWindow(windowType) {

        this.window = [];

        if (windowType == 'blackman') {

            // Blackman analysis window   
            let N = this.fftSize;
            let a0 = 0.42;
            let a1 = 0.5;
            let a2 = 0.08;
            for (let i = 0; i < N; i++) {
                let f = 6.283185307179586 * i / (N - 1);
                this.window[i] = a0 - a1 * Math.cos(f) + a2 * Math.cos(2 * f);
            }
        }
    }

    /**
     * Set frequency array, coresponding to freq/bin
     */
    setFrequency() {

        this.frequency = [];
        for (let i = 0; i < this.fftSize / 2; i++) {
            this.frequency[i] = i * this.sampleRate / this.fftSize;
        }
    }
}


