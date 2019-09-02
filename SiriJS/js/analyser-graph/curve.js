/* 
 * Free Curve Drawer (JavaScript)
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
 */

class Curve {

    static TYPE_LINE = 0;
    static TYPE_BEZIER_CURVE = 1;
    static TYPE_QUADRATIC_CURVE = 2;

    constructor(args = {}) {

        // default values
        this.args = Object.assign({
            context: null,

            isFilled: true,             // fill the graph
            isStroked: true,            // stroke the graph
            isClosed: true,             // close the graph  
            showPoints: false,          // show input points

            fill: 'white',              // graph fill color
            stroke: 'white',            // graph stroke color
            strokeWidth: 1,             // stroke width
            strokeStyle: [],            // dash line pattern 
            pointsFill: 'blue',         // input points fill color

            points: [],                 // array with input points
            
            factor: 0.3,                // factor
            tension: 0.5,               // tension
            numOfSegments: 16,          // the number of segments

            type: Curve.TYPE_LINE       // how to draw the curves
        }, args);

        for (const key of Object.keys(this.args)) {
            this[key] = this.args[key];
        }

    }


    /**
     * Add new point to the array
     * @param {Number} x x float point
     * @param {Number} y y float point
     */
    add(x, y) {
        this.points.push({ x: x, y: y });
        return this;
    }

    /**
     * Remove a point from the array by index
     * @param {Number} index index in the array
     */
    remove(index) {
        if (this.points.length > index) {
            this.points.splice(index, 1);
        }
        return this;
    }

    /**
     * Clear all points from the array
     */
    clear() {
        this.points = [];
    }

    /**
     * Draw curve using points from array
     * @param {CanvasRenderingContext2D} context Canvas context
     * @param {Array} points Array with points
     */
    draw(context = this.context, points = this.points) {

        // which method to use, to draw the curve
        switch (this.type) {
            case Curve.TYPE_LINE:
                this._line(context, points);
                break;
            case Curve.TYPE_BEZIER_CURVE:
                this._bezierCurve(context, points);
                break;
            case Curve.TYPE_QUADRATIC_CURVE:
                this._quadraticCurve(context, points);
                break;
        }

        // close curve
        if (this.isClosed) {
            context.closePath();
        }

        // fill curve
        if (this.isFilled) {
            context.fillStyle = this.fill;
            context.fill();
        }

        // stroke curve
        if (this.isStroked) {
            context.strokeStyle = this.stroke;
            context.lineWidth = this.strokeWidth;
            context.setLineDash(this.strokeStyle);
            context.stroke();
        }

        // show points from the array
        if (this.showPoints) {
            context.fillStyle = this.pointsFill;
            for (let i = 0; i < points.length; i++) {
                context.fillRect(points[i].x - 2, points[i].y - 2, 4, 4);
            }
        }

        return this;
    }


    /**
     * Draw curves passing by all points from the array 
     * (draw the curves using lines)
     *  
     */
    _line(context, points) {

        let _points = [];           // clone array
        let x, y;                   // our x,y coords
        let t1x, t2x, t1y, t2y;     // tension vectors
        let c1, c2, c3, c4;         // cardinal points
        let st;                     // steps based on num. of segments

        // clone array so we don't change the original 
        _points = points.slice(0);

        // The algorithm require a previous and next point to the actual point array.
        // Check if we will draw closed or open curve.
        // If closed, copy end points to beginning and first points to end
        // If open, duplicate first points to befinning, end points to end
        if (this.isClosed) {
            _points.unshift(points[points.length - 1]);
            _points.push(points[0]);
        }
        else {
            _points.unshift(points[0]);
            _points.push(points[points.length - 1]);
        }

        context.beginPath();
        context.moveTo(_points[0].x, _points[0].y);

        // 1. loop goes through point array
        // 2. loop goes through each segment between the 2 points + 1e point before and after
        for (let i = 1; i < (_points.length - 2); i++) {
            for (let t = 0; t <= this.numOfSegments; t++) {

                // calc tension vectors
                t1x = (_points[i + 1].x - _points[i - 1].x) * this.tension;
                t1y = (_points[i + 1].y - _points[i - 1].y) * this.tension;

                t2x = (_points[i + 2].x - _points[i + 0].x) * this.tension;
                t2y = (_points[i + 2].y - _points[i + 0].y) * this.tension;

                // calc step
                st = t / this.numOfSegments;

                // calc cardinals
                c1 = 2 * Math.pow(st, 3) - 3 * Math.pow(st, 2) + 1;
                c2 = -c1 + 1;
                c3 = Math.pow(st, 3) - 2 * Math.pow(st, 2) + st;
                c4 = Math.pow(st, 3) - Math.pow(st, 2);

                // calc x and y cords with common control vectors
                x = c1 * _points[i + 0].x + c2 * _points[i + 1].x + c3 * t1x + c4 * t2x;
                y = c1 * _points[i + 0].y + c2 * _points[i + 1].y + c3 * t1y + c4 * t2y;

                // draw line 
                context.lineTo(x, y);
            }
        }
    }

    /**
     * Draw curves passing by all points from the array 
     * (draw the curves using bezier curve)
     *  
     */
    _bezierCurve(context, points) {
 
        // f = 0, will be straight line
        // t suppose to be 1, but changing the value can control the smoothness too
        let f = this.factor;    // factor
        let t = this.tension;   // tension

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);

        let m = 0;
        let dx1 = 0;
        let dy1 = 0;
        let dx2;
        let dy2;

        let preP = points[0];
        for (let i = 1; i < points.length; i++) {
            let curP = points[i];
            let nexP = points[i + 1];

            if (nexP) {
                m = this.gradient(preP, nexP);
                dx2 = (nexP.x - curP.x) * -f;
                dy2 = dx2 * m * t;
            } else {
                dx2 = 0;
                dy2 = 0;
            }

            context.bezierCurveTo(
                preP.x - dx1,
                preP.y - dy1,
                curP.x + dx2,
                curP.y + dy2,
                curP.x, curP.y);

            dx1 = dx2;
            dy1 = dy2;
            preP = curP;
        }

    }

    /**
     * Draw curves passing by all points from the array 
     * (draw the curves using quadratic curve)
     *  
     */
    _quadraticCurve(context, points) {

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {

            let x_mid = (points[i].x + points[i + 1].x) / 2;
            let y_mid = (points[i].y + points[i + 1].y) / 2;
            let cp_x1 = (x_mid + points[i].x) / 2;
            let cp_x2 = (x_mid + points[i + 1].x) / 2;

            context.quadraticCurveTo(
                cp_x1,
                points[i].y,
                x_mid,
                y_mid);
            context.quadraticCurveTo(
                cp_x2,
                points[i + 1].y,
                points[i + 1].x,
                points[i + 1].y);
        }
    }

    gradient(a, b) {
        return (b.y - a.y) / (b.x - a.x);
    }
}


