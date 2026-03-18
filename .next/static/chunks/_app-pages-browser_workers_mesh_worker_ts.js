/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	// runtime can't be in strict mode because a global variable is assign and maybe created.
/******/ 	var __webpack_modules__ = ({

/***/ "(app-pages-browser)/./node_modules/earcut/src/earcut.js":
/*!*******************************************!*\
  !*** ./node_modules/earcut/src/earcut.js ***!
  \*******************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("\n\nmodule.exports = earcut;\nmodule.exports[\"default\"] = earcut;\n\nfunction earcut(data, holeIndices, dim) {\n\n    dim = dim || 2;\n\n    var hasHoles = holeIndices && holeIndices.length,\n        outerLen = hasHoles ? holeIndices[0] * dim : data.length,\n        outerNode = linkedList(data, 0, outerLen, dim, true),\n        triangles = [];\n\n    if (!outerNode || outerNode.next === outerNode.prev) return triangles;\n\n    var minX, minY, maxX, maxY, x, y, invSize;\n\n    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);\n\n    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox\n    if (data.length > 80 * dim) {\n        minX = maxX = data[0];\n        minY = maxY = data[1];\n\n        for (var i = dim; i < outerLen; i += dim) {\n            x = data[i];\n            y = data[i + 1];\n            if (x < minX) minX = x;\n            if (y < minY) minY = y;\n            if (x > maxX) maxX = x;\n            if (y > maxY) maxY = y;\n        }\n\n        // minX, minY and invSize are later used to transform coords into integers for z-order calculation\n        invSize = Math.max(maxX - minX, maxY - minY);\n        invSize = invSize !== 0 ? 32767 / invSize : 0;\n    }\n\n    earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);\n\n    return triangles;\n}\n\n// create a circular doubly linked list from polygon points in the specified winding order\nfunction linkedList(data, start, end, dim, clockwise) {\n    var i, last;\n\n    if (clockwise === (signedArea(data, start, end, dim) > 0)) {\n        for (i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);\n    } else {\n        for (i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);\n    }\n\n    if (last && equals(last, last.next)) {\n        removeNode(last);\n        last = last.next;\n    }\n\n    return last;\n}\n\n// eliminate colinear or duplicate points\nfunction filterPoints(start, end) {\n    if (!start) return start;\n    if (!end) end = start;\n\n    var p = start,\n        again;\n    do {\n        again = false;\n\n        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {\n            removeNode(p);\n            p = end = p.prev;\n            if (p === p.next) break;\n            again = true;\n\n        } else {\n            p = p.next;\n        }\n    } while (again || p !== end);\n\n    return end;\n}\n\n// main ear slicing loop which triangulates a polygon (given as a linked list)\nfunction earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {\n    if (!ear) return;\n\n    // interlink polygon nodes in z-order\n    if (!pass && invSize) indexCurve(ear, minX, minY, invSize);\n\n    var stop = ear,\n        prev, next;\n\n    // iterate through ears, slicing them one by one\n    while (ear.prev !== ear.next) {\n        prev = ear.prev;\n        next = ear.next;\n\n        if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {\n            // cut off the triangle\n            triangles.push(prev.i / dim | 0);\n            triangles.push(ear.i / dim | 0);\n            triangles.push(next.i / dim | 0);\n\n            removeNode(ear);\n\n            // skipping the next vertex leads to less sliver triangles\n            ear = next.next;\n            stop = next.next;\n\n            continue;\n        }\n\n        ear = next;\n\n        // if we looped through the whole remaining polygon and can't find any more ears\n        if (ear === stop) {\n            // try filtering points and slicing again\n            if (!pass) {\n                earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);\n\n            // if this didn't work, try curing all small self-intersections locally\n            } else if (pass === 1) {\n                ear = cureLocalIntersections(filterPoints(ear), triangles, dim);\n                earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);\n\n            // as a last resort, try splitting the remaining polygon into two\n            } else if (pass === 2) {\n                splitEarcut(ear, triangles, dim, minX, minY, invSize);\n            }\n\n            break;\n        }\n    }\n}\n\n// check whether a polygon node forms a valid ear with adjacent nodes\nfunction isEar(ear) {\n    var a = ear.prev,\n        b = ear,\n        c = ear.next;\n\n    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear\n\n    // now make sure we don't have other points inside the potential ear\n    var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;\n\n    // triangle bbox; min & max are calculated like this for speed\n    var x0 = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx),\n        y0 = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy),\n        x1 = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx),\n        y1 = ay > by ? (ay > cy ? ay : cy) : (by > cy ? by : cy);\n\n    var p = c.next;\n    while (p !== a) {\n        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 &&\n            pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&\n            area(p.prev, p, p.next) >= 0) return false;\n        p = p.next;\n    }\n\n    return true;\n}\n\nfunction isEarHashed(ear, minX, minY, invSize) {\n    var a = ear.prev,\n        b = ear,\n        c = ear.next;\n\n    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear\n\n    var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;\n\n    // triangle bbox; min & max are calculated like this for speed\n    var x0 = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx),\n        y0 = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy),\n        x1 = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx),\n        y1 = ay > by ? (ay > cy ? ay : cy) : (by > cy ? by : cy);\n\n    // z-order range for the current triangle bbox;\n    var minZ = zOrder(x0, y0, minX, minY, invSize),\n        maxZ = zOrder(x1, y1, minX, minY, invSize);\n\n    var p = ear.prevZ,\n        n = ear.nextZ;\n\n    // look for points inside the triangle in both directions\n    while (p && p.z >= minZ && n && n.z <= maxZ) {\n        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c &&\n            pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;\n        p = p.prevZ;\n\n        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c &&\n            pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;\n        n = n.nextZ;\n    }\n\n    // look for remaining points in decreasing z-order\n    while (p && p.z >= minZ) {\n        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c &&\n            pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;\n        p = p.prevZ;\n    }\n\n    // look for remaining points in increasing z-order\n    while (n && n.z <= maxZ) {\n        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c &&\n            pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;\n        n = n.nextZ;\n    }\n\n    return true;\n}\n\n// go through all polygon nodes and cure small local self-intersections\nfunction cureLocalIntersections(start, triangles, dim) {\n    var p = start;\n    do {\n        var a = p.prev,\n            b = p.next.next;\n\n        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {\n\n            triangles.push(a.i / dim | 0);\n            triangles.push(p.i / dim | 0);\n            triangles.push(b.i / dim | 0);\n\n            // remove two nodes involved\n            removeNode(p);\n            removeNode(p.next);\n\n            p = start = b;\n        }\n        p = p.next;\n    } while (p !== start);\n\n    return filterPoints(p);\n}\n\n// try splitting polygon into two and triangulate them independently\nfunction splitEarcut(start, triangles, dim, minX, minY, invSize) {\n    // look for a valid diagonal that divides the polygon into two\n    var a = start;\n    do {\n        var b = a.next.next;\n        while (b !== a.prev) {\n            if (a.i !== b.i && isValidDiagonal(a, b)) {\n                // split the polygon in two by the diagonal\n                var c = splitPolygon(a, b);\n\n                // filter colinear points around the cuts\n                a = filterPoints(a, a.next);\n                c = filterPoints(c, c.next);\n\n                // run earcut on each half\n                earcutLinked(a, triangles, dim, minX, minY, invSize, 0);\n                earcutLinked(c, triangles, dim, minX, minY, invSize, 0);\n                return;\n            }\n            b = b.next;\n        }\n        a = a.next;\n    } while (a !== start);\n}\n\n// link every hole into the outer loop, producing a single-ring polygon without holes\nfunction eliminateHoles(data, holeIndices, outerNode, dim) {\n    var queue = [],\n        i, len, start, end, list;\n\n    for (i = 0, len = holeIndices.length; i < len; i++) {\n        start = holeIndices[i] * dim;\n        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;\n        list = linkedList(data, start, end, dim, false);\n        if (list === list.next) list.steiner = true;\n        queue.push(getLeftmost(list));\n    }\n\n    queue.sort(compareX);\n\n    // process holes from left to right\n    for (i = 0; i < queue.length; i++) {\n        outerNode = eliminateHole(queue[i], outerNode);\n    }\n\n    return outerNode;\n}\n\nfunction compareX(a, b) {\n    return a.x - b.x;\n}\n\n// find a bridge between vertices that connects hole with an outer ring and and link it\nfunction eliminateHole(hole, outerNode) {\n    var bridge = findHoleBridge(hole, outerNode);\n    if (!bridge) {\n        return outerNode;\n    }\n\n    var bridgeReverse = splitPolygon(bridge, hole);\n\n    // filter collinear points around the cuts\n    filterPoints(bridgeReverse, bridgeReverse.next);\n    return filterPoints(bridge, bridge.next);\n}\n\n// David Eberly's algorithm for finding a bridge between hole and outer polygon\nfunction findHoleBridge(hole, outerNode) {\n    var p = outerNode,\n        hx = hole.x,\n        hy = hole.y,\n        qx = -Infinity,\n        m;\n\n    // find a segment intersected by a ray from the hole's leftmost point to the left;\n    // segment's endpoint with lesser x will be potential connection point\n    do {\n        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {\n            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);\n            if (x <= hx && x > qx) {\n                qx = x;\n                m = p.x < p.next.x ? p : p.next;\n                if (x === hx) return m; // hole touches outer segment; pick leftmost endpoint\n            }\n        }\n        p = p.next;\n    } while (p !== outerNode);\n\n    if (!m) return null;\n\n    // look for points inside the triangle of hole point, segment intersection and endpoint;\n    // if there are no points found, we have a valid connection;\n    // otherwise choose the point of the minimum angle with the ray as connection point\n\n    var stop = m,\n        mx = m.x,\n        my = m.y,\n        tanMin = Infinity,\n        tan;\n\n    p = m;\n\n    do {\n        if (hx >= p.x && p.x >= mx && hx !== p.x &&\n                pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {\n\n            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential\n\n            if (locallyInside(p, hole) &&\n                (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))) {\n                m = p;\n                tanMin = tan;\n            }\n        }\n\n        p = p.next;\n    } while (p !== stop);\n\n    return m;\n}\n\n// whether sector in vertex m contains sector in vertex p in the same coordinates\nfunction sectorContainsSector(m, p) {\n    return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;\n}\n\n// interlink polygon nodes in z-order\nfunction indexCurve(start, minX, minY, invSize) {\n    var p = start;\n    do {\n        if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize);\n        p.prevZ = p.prev;\n        p.nextZ = p.next;\n        p = p.next;\n    } while (p !== start);\n\n    p.prevZ.nextZ = null;\n    p.prevZ = null;\n\n    sortLinked(p);\n}\n\n// Simon Tatham's linked list merge sort algorithm\n// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html\nfunction sortLinked(list) {\n    var i, p, q, e, tail, numMerges, pSize, qSize,\n        inSize = 1;\n\n    do {\n        p = list;\n        list = null;\n        tail = null;\n        numMerges = 0;\n\n        while (p) {\n            numMerges++;\n            q = p;\n            pSize = 0;\n            for (i = 0; i < inSize; i++) {\n                pSize++;\n                q = q.nextZ;\n                if (!q) break;\n            }\n            qSize = inSize;\n\n            while (pSize > 0 || (qSize > 0 && q)) {\n\n                if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {\n                    e = p;\n                    p = p.nextZ;\n                    pSize--;\n                } else {\n                    e = q;\n                    q = q.nextZ;\n                    qSize--;\n                }\n\n                if (tail) tail.nextZ = e;\n                else list = e;\n\n                e.prevZ = tail;\n                tail = e;\n            }\n\n            p = q;\n        }\n\n        tail.nextZ = null;\n        inSize *= 2;\n\n    } while (numMerges > 1);\n\n    return list;\n}\n\n// z-order of a point given coords and inverse of the longer side of data bbox\nfunction zOrder(x, y, minX, minY, invSize) {\n    // coords are transformed into non-negative 15-bit integer range\n    x = (x - minX) * invSize | 0;\n    y = (y - minY) * invSize | 0;\n\n    x = (x | (x << 8)) & 0x00FF00FF;\n    x = (x | (x << 4)) & 0x0F0F0F0F;\n    x = (x | (x << 2)) & 0x33333333;\n    x = (x | (x << 1)) & 0x55555555;\n\n    y = (y | (y << 8)) & 0x00FF00FF;\n    y = (y | (y << 4)) & 0x0F0F0F0F;\n    y = (y | (y << 2)) & 0x33333333;\n    y = (y | (y << 1)) & 0x55555555;\n\n    return x | (y << 1);\n}\n\n// find the leftmost node of a polygon ring\nfunction getLeftmost(start) {\n    var p = start,\n        leftmost = start;\n    do {\n        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;\n        p = p.next;\n    } while (p !== start);\n\n    return leftmost;\n}\n\n// check if a point lies within a convex triangle\nfunction pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {\n    return (cx - px) * (ay - py) >= (ax - px) * (cy - py) &&\n           (ax - px) * (by - py) >= (bx - px) * (ay - py) &&\n           (bx - px) * (cy - py) >= (cx - px) * (by - py);\n}\n\n// check if a diagonal between two polygon nodes is valid (lies in polygon interior)\nfunction isValidDiagonal(a, b) {\n    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // dones't intersect other edges\n           (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible\n            (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors\n            equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0); // special zero-length case\n}\n\n// signed area of a triangle\nfunction area(p, q, r) {\n    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);\n}\n\n// check if two points are equal\nfunction equals(p1, p2) {\n    return p1.x === p2.x && p1.y === p2.y;\n}\n\n// check if two segments intersect\nfunction intersects(p1, q1, p2, q2) {\n    var o1 = sign(area(p1, q1, p2));\n    var o2 = sign(area(p1, q1, q2));\n    var o3 = sign(area(p2, q2, p1));\n    var o4 = sign(area(p2, q2, q1));\n\n    if (o1 !== o2 && o3 !== o4) return true; // general case\n\n    if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1\n    if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1\n    if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2\n    if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2\n\n    return false;\n}\n\n// for collinear points p, q, r, check if point q lies on segment pr\nfunction onSegment(p, q, r) {\n    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);\n}\n\nfunction sign(num) {\n    return num > 0 ? 1 : num < 0 ? -1 : 0;\n}\n\n// check if a polygon diagonal intersects any polygon segments\nfunction intersectsPolygon(a, b) {\n    var p = a;\n    do {\n        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&\n                intersects(p, p.next, a, b)) return true;\n        p = p.next;\n    } while (p !== a);\n\n    return false;\n}\n\n// check if a polygon diagonal is locally inside the polygon\nfunction locallyInside(a, b) {\n    return area(a.prev, a, a.next) < 0 ?\n        area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :\n        area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;\n}\n\n// check if the middle point of a polygon diagonal is inside the polygon\nfunction middleInside(a, b) {\n    var p = a,\n        inside = false,\n        px = (a.x + b.x) / 2,\n        py = (a.y + b.y) / 2;\n    do {\n        if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&\n                (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))\n            inside = !inside;\n        p = p.next;\n    } while (p !== a);\n\n    return inside;\n}\n\n// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;\n// if one belongs to the outer ring and another to a hole, it merges it into a single ring\nfunction splitPolygon(a, b) {\n    var a2 = new Node(a.i, a.x, a.y),\n        b2 = new Node(b.i, b.x, b.y),\n        an = a.next,\n        bp = b.prev;\n\n    a.next = b;\n    b.prev = a;\n\n    a2.next = an;\n    an.prev = a2;\n\n    b2.next = a2;\n    a2.prev = b2;\n\n    bp.next = b2;\n    b2.prev = bp;\n\n    return b2;\n}\n\n// create a node and optionally link it with previous one (in a circular doubly linked list)\nfunction insertNode(i, x, y, last) {\n    var p = new Node(i, x, y);\n\n    if (!last) {\n        p.prev = p;\n        p.next = p;\n\n    } else {\n        p.next = last.next;\n        p.prev = last;\n        last.next.prev = p;\n        last.next = p;\n    }\n    return p;\n}\n\nfunction removeNode(p) {\n    p.next.prev = p.prev;\n    p.prev.next = p.next;\n\n    if (p.prevZ) p.prevZ.nextZ = p.nextZ;\n    if (p.nextZ) p.nextZ.prevZ = p.prevZ;\n}\n\nfunction Node(i, x, y) {\n    // vertex index in coordinates array\n    this.i = i;\n\n    // vertex coordinates\n    this.x = x;\n    this.y = y;\n\n    // previous and next vertex nodes in a polygon ring\n    this.prev = null;\n    this.next = null;\n\n    // z-order curve value\n    this.z = 0;\n\n    // previous and next nodes in z-order\n    this.prevZ = null;\n    this.nextZ = null;\n\n    // indicates whether this is a steiner point\n    this.steiner = false;\n}\n\n// return a percentage difference between the polygon area and its triangulation area;\n// used to verify correctness of triangulation\nearcut.deviation = function (data, holeIndices, dim, triangles) {\n    var hasHoles = holeIndices && holeIndices.length;\n    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;\n\n    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));\n    if (hasHoles) {\n        for (var i = 0, len = holeIndices.length; i < len; i++) {\n            var start = holeIndices[i] * dim;\n            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;\n            polygonArea -= Math.abs(signedArea(data, start, end, dim));\n        }\n    }\n\n    var trianglesArea = 0;\n    for (i = 0; i < triangles.length; i += 3) {\n        var a = triangles[i] * dim;\n        var b = triangles[i + 1] * dim;\n        var c = triangles[i + 2] * dim;\n        trianglesArea += Math.abs(\n            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -\n            (data[a] - data[b]) * (data[c + 1] - data[a + 1]));\n    }\n\n    return polygonArea === 0 && trianglesArea === 0 ? 0 :\n        Math.abs((trianglesArea - polygonArea) / polygonArea);\n};\n\nfunction signedArea(data, start, end, dim) {\n    var sum = 0;\n    for (var i = start, j = end - dim; i < end; i += dim) {\n        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);\n        j = i;\n    }\n    return sum;\n}\n\n// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts\nearcut.flatten = function (data) {\n    var dim = data[0][0].length,\n        result = {vertices: [], holes: [], dimensions: dim},\n        holeIndex = 0;\n\n    for (var i = 0; i < data.length; i++) {\n        for (var j = 0; j < data[i].length; j++) {\n            for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);\n        }\n        if (i > 0) {\n            holeIndex += data[i - 1].length;\n            result.holes.push(holeIndex);\n        }\n    }\n    return result;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9lYXJjdXQvc3JjL2VhcmN1dC5qcyIsIm1hcHBpbmdzIjoiQUFBYTs7QUFFYjtBQUNBLHlCQUFzQjs7QUFFdEI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUEsMkVBQTJFO0FBQzNFO0FBQ0E7QUFDQTs7QUFFQSwwQkFBMEIsY0FBYztBQUN4QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHdCQUF3QixTQUFTO0FBQ2pDLE1BQU07QUFDTiw0QkFBNEIsWUFBWTtBQUN4Qzs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsVUFBVTtBQUNWO0FBQ0E7QUFDQSxNQUFNOztBQUVOO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjO0FBQ2Q7QUFDQTs7QUFFQTtBQUNBLGNBQWM7QUFDZDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsMENBQTBDOztBQUUxQztBQUNBOztBQUVBLHNCQUFzQjtBQUN0QjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLDBDQUEwQzs7QUFFMUM7O0FB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QTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esa0RBQWtELFNBQVM7QUFDM0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGdCQUFnQixzQkFBc0I7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSx1Q0FBdUMsU0FBUztBQUNoRDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQix5Q0FBeUM7QUFDM0Q7O0FBRUEsb0JBQW9CLGlCQUFpQjtBQUNyQyx3QkFBd0Isb0JBQW9CO0FBQzVDLDRCQUE0QixTQUFTO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL2VhcmN1dC9zcmMvZWFyY3V0LmpzP2ZhNDEiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVhcmN1dDtcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBlYXJjdXQ7XG5cbmZ1bmN0aW9uIGVhcmN1dChkYXRhLCBob2xlSW5kaWNlcywgZGltKSB7XG5cbiAgICBkaW0gPSBkaW0gfHwgMjtcblxuICAgIHZhciBoYXNIb2xlcyA9IGhvbGVJbmRpY2VzICYmIGhvbGVJbmRpY2VzLmxlbmd0aCxcbiAgICAgICAgb3V0ZXJMZW4gPSBoYXNIb2xlcyA/IGhvbGVJbmRpY2VzWzBdICogZGltIDogZGF0YS5sZW5ndGgsXG4gICAgICAgIG91dGVyTm9kZSA9IGxpbmtlZExpc3QoZGF0YSwgMCwgb3V0ZXJMZW4sIGRpbSwgdHJ1ZSksXG4gICAgICAgIHRyaWFuZ2xlcyA9IFtdO1xuXG4gICAgaWYgKCFvdXRlck5vZGUgfHwgb3V0ZXJOb2RlLm5leHQgPT09IG91dGVyTm9kZS5wcmV2KSByZXR1cm4gdHJpYW5nbGVzO1xuXG4gICAgdmFyIG1pblgsIG1pblksIG1heFgsIG1heFksIHgsIHksIGludlNpemU7XG5cbiAgICBpZiAoaGFzSG9sZXMpIG91dGVyTm9kZSA9IGVsaW1pbmF0ZUhvbGVzKGRhdGEsIGhvbGVJbmRpY2VzLCBvdXRlck5vZGUsIGRpbSk7XG5cbiAgICAvLyBpZiB0aGUgc2hhcGUgaXMgbm90IHRvbyBzaW1wbGUsIHdlJ2xsIHVzZSB6LW9yZGVyIGN1cnZlIGhhc2ggbGF0ZXI7IGNhbGN1bGF0ZSBwb2x5Z29uIGJib3hcbiAgICBpZiAoZGF0YS5sZW5ndGggPiA4MCAqIGRpbSkge1xuICAgICAgICBtaW5YID0gbWF4WCA9IGRhdGFbMF07XG4gICAgICAgIG1pblkgPSBtYXhZID0gZGF0YVsxXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gZGltOyBpIDwgb3V0ZXJMZW47IGkgKz0gZGltKSB7XG4gICAgICAgICAgICB4ID0gZGF0YVtpXTtcbiAgICAgICAgICAgIHkgPSBkYXRhW2kgKyAxXTtcbiAgICAgICAgICAgIGlmICh4IDwgbWluWCkgbWluWCA9IHg7XG4gICAgICAgICAgICBpZiAoeSA8IG1pblkpIG1pblkgPSB5O1xuICAgICAgICAgICAgaWYgKHggPiBtYXhYKSBtYXhYID0geDtcbiAgICAgICAgICAgIGlmICh5ID4gbWF4WSkgbWF4WSA9IHk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtaW5YLCBtaW5ZIGFuZCBpbnZTaXplIGFyZSBsYXRlciB1c2VkIHRvIHRyYW5zZm9ybSBjb29yZHMgaW50byBpbnRlZ2VycyBmb3Igei1vcmRlciBjYWxjdWxhdGlvblxuICAgICAgICBpbnZTaXplID0gTWF0aC5tYXgobWF4WCAtIG1pblgsIG1heFkgLSBtaW5ZKTtcbiAgICAgICAgaW52U2l6ZSA9IGludlNpemUgIT09IDAgPyAzMjc2NyAvIGludlNpemUgOiAwO1xuICAgIH1cblxuICAgIGVhcmN1dExpbmtlZChvdXRlck5vZGUsIHRyaWFuZ2xlcywgZGltLCBtaW5YLCBtaW5ZLCBpbnZTaXplLCAwKTtcblxuICAgIHJldHVybiB0cmlhbmdsZXM7XG59XG5cbi8vIGNyZWF0ZSBhIGNpcmN1bGFyIGRvdWJseSBsaW5rZWQgbGlzdCBmcm9tIHBvbHlnb24gcG9pbnRzIGluIHRoZSBzcGVjaWZpZWQgd2luZGluZyBvcmRlclxuZnVuY3Rpb24gbGlua2VkTGlzdChkYXRhLCBzdGFydCwgZW5kLCBkaW0sIGNsb2Nrd2lzZSkge1xuICAgIHZhciBpLCBsYXN0O1xuXG4gICAgaWYgKGNsb2Nrd2lzZSA9PT0gKHNpZ25lZEFyZWEoZGF0YSwgc3RhcnQsIGVuZCwgZGltKSA+IDApKSB7XG4gICAgICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IGRpbSkgbGFzdCA9IGluc2VydE5vZGUoaSwgZGF0YVtpXSwgZGF0YVtpICsgMV0sIGxhc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoaSA9IGVuZCAtIGRpbTsgaSA+PSBzdGFydDsgaSAtPSBkaW0pIGxhc3QgPSBpbnNlcnROb2RlKGksIGRhdGFbaV0sIGRhdGFbaSArIDFdLCBsYXN0KTtcbiAgICB9XG5cbiAgICBpZiAobGFzdCAmJiBlcXVhbHMobGFzdCwgbGFzdC5uZXh0KSkge1xuICAgICAgICByZW1vdmVOb2RlKGxhc3QpO1xuICAgICAgICBsYXN0ID0gbGFzdC5uZXh0O1xuICAgIH1cblxuICAgIHJldHVybiBsYXN0O1xufVxuXG4vLyBlbGltaW5hdGUgY29saW5lYXIgb3IgZHVwbGljYXRlIHBvaW50c1xuZnVuY3Rpb24gZmlsdGVyUG9pbnRzKHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoIXN0YXJ0KSByZXR1cm4gc3RhcnQ7XG4gICAgaWYgKCFlbmQpIGVuZCA9IHN0YXJ0O1xuXG4gICAgdmFyIHAgPSBzdGFydCxcbiAgICAgICAgYWdhaW47XG4gICAgZG8ge1xuICAgICAgICBhZ2FpbiA9IGZhbHNlO1xuXG4gICAgICAgIGlmICghcC5zdGVpbmVyICYmIChlcXVhbHMocCwgcC5uZXh0KSB8fCBhcmVhKHAucHJldiwgcCwgcC5uZXh0KSA9PT0gMCkpIHtcbiAgICAgICAgICAgIHJlbW92ZU5vZGUocCk7XG4gICAgICAgICAgICBwID0gZW5kID0gcC5wcmV2O1xuICAgICAgICAgICAgaWYgKHAgPT09IHAubmV4dCkgYnJlYWs7XG4gICAgICAgICAgICBhZ2FpbiA9IHRydWU7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHAgPSBwLm5leHQ7XG4gICAgICAgIH1cbiAgICB9IHdoaWxlIChhZ2FpbiB8fCBwICE9PSBlbmQpO1xuXG4gICAgcmV0dXJuIGVuZDtcbn1cblxuLy8gbWFpbiBlYXIgc2xpY2luZyBsb29wIHdoaWNoIHRyaWFuZ3VsYXRlcyBhIHBvbHlnb24gKGdpdmVuIGFzIGEgbGlua2VkIGxpc3QpXG5mdW5jdGlvbiBlYXJjdXRMaW5rZWQoZWFyLCB0cmlhbmdsZXMsIGRpbSwgbWluWCwgbWluWSwgaW52U2l6ZSwgcGFzcykge1xuICAgIGlmICghZWFyKSByZXR1cm47XG5cbiAgICAvLyBpbnRlcmxpbmsgcG9seWdvbiBub2RlcyBpbiB6LW9yZGVyXG4gICAgaWYgKCFwYXNzICYmIGludlNpemUpIGluZGV4Q3VydmUoZWFyLCBtaW5YLCBtaW5ZLCBpbnZTaXplKTtcblxuICAgIHZhciBzdG9wID0gZWFyLFxuICAgICAgICBwcmV2LCBuZXh0O1xuXG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIGVhcnMsIHNsaWNpbmcgdGhlbSBvbmUgYnkgb25lXG4gICAgd2hpbGUgKGVhci5wcmV2ICE9PSBlYXIubmV4dCkge1xuICAgICAgICBwcmV2ID0gZWFyLnByZXY7XG4gICAgICAgIG5leHQgPSBlYXIubmV4dDtcblxuICAgICAgICBpZiAoaW52U2l6ZSA/IGlzRWFySGFzaGVkKGVhciwgbWluWCwgbWluWSwgaW52U2l6ZSkgOiBpc0VhcihlYXIpKSB7XG4gICAgICAgICAgICAvLyBjdXQgb2ZmIHRoZSB0cmlhbmdsZVxuICAgICAgICAgICAgdHJpYW5nbGVzLnB1c2gocHJldi5pIC8gZGltIHwgMCk7XG4gICAgICAgICAgICB0cmlhbmdsZXMucHVzaChlYXIuaSAvIGRpbSB8IDApO1xuICAgICAgICAgICAgdHJpYW5nbGVzLnB1c2gobmV4dC5pIC8gZGltIHwgMCk7XG5cbiAgICAgICAgICAgIHJlbW92ZU5vZGUoZWFyKTtcblxuICAgICAgICAgICAgLy8gc2tpcHBpbmcgdGhlIG5leHQgdmVydGV4IGxlYWRzIHRvIGxlc3Mgc2xpdmVyIHRyaWFuZ2xlc1xuICAgICAgICAgICAgZWFyID0gbmV4dC5uZXh0O1xuICAgICAgICAgICAgc3RvcCA9IG5leHQubmV4dDtcblxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBlYXIgPSBuZXh0O1xuXG4gICAgICAgIC8vIGlmIHdlIGxvb3BlZCB0aHJvdWdoIHRoZSB3aG9sZSByZW1haW5pbmcgcG9seWdvbiBhbmQgY2FuJ3QgZmluZCBhbnkgbW9yZSBlYXJzXG4gICAgICAgIGlmIChlYXIgPT09IHN0b3ApIHtcbiAgICAgICAgICAgIC8vIHRyeSBmaWx0ZXJpbmcgcG9pbnRzIGFuZCBzbGljaW5nIGFnYWluXG4gICAgICAgICAgICBpZiAoIXBhc3MpIHtcbiAgICAgICAgICAgICAgICBlYXJjdXRMaW5rZWQoZmlsdGVyUG9pbnRzKGVhciksIHRyaWFuZ2xlcywgZGltLCBtaW5YLCBtaW5ZLCBpbnZTaXplLCAxKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhpcyBkaWRuJ3Qgd29yaywgdHJ5IGN1cmluZyBhbGwgc21hbGwgc2VsZi1pbnRlcnNlY3Rpb25zIGxvY2FsbHlcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFzcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGVhciA9IGN1cmVMb2NhbEludGVyc2VjdGlvbnMoZmlsdGVyUG9pbnRzKGVhciksIHRyaWFuZ2xlcywgZGltKTtcbiAgICAgICAgICAgICAgICBlYXJjdXRMaW5rZWQoZWFyLCB0cmlhbmdsZXMsIGRpbSwgbWluWCwgbWluWSwgaW52U2l6ZSwgMik7XG5cbiAgICAgICAgICAgIC8vIGFzIGEgbGFzdCByZXNvcnQsIHRyeSBzcGxpdHRpbmcgdGhlIHJlbWFpbmluZyBwb2x5Z29uIGludG8gdHdvXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhc3MgPT09IDIpIHtcbiAgICAgICAgICAgICAgICBzcGxpdEVhcmN1dChlYXIsIHRyaWFuZ2xlcywgZGltLCBtaW5YLCBtaW5ZLCBpbnZTaXplKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIGNoZWNrIHdoZXRoZXIgYSBwb2x5Z29uIG5vZGUgZm9ybXMgYSB2YWxpZCBlYXIgd2l0aCBhZGphY2VudCBub2Rlc1xuZnVuY3Rpb24gaXNFYXIoZWFyKSB7XG4gICAgdmFyIGEgPSBlYXIucHJldixcbiAgICAgICAgYiA9IGVhcixcbiAgICAgICAgYyA9IGVhci5uZXh0O1xuXG4gICAgaWYgKGFyZWEoYSwgYiwgYykgPj0gMCkgcmV0dXJuIGZhbHNlOyAvLyByZWZsZXgsIGNhbid0IGJlIGFuIGVhclxuXG4gICAgLy8gbm93IG1ha2Ugc3VyZSB3ZSBkb24ndCBoYXZlIG90aGVyIHBvaW50cyBpbnNpZGUgdGhlIHBvdGVudGlhbCBlYXJcbiAgICB2YXIgYXggPSBhLngsIGJ4ID0gYi54LCBjeCA9IGMueCwgYXkgPSBhLnksIGJ5ID0gYi55LCBjeSA9IGMueTtcblxuICAgIC8vIHRyaWFuZ2xlIGJib3g7IG1pbiAmIG1heCBhcmUgY2FsY3VsYXRlZCBsaWtlIHRoaXMgZm9yIHNwZWVkXG4gICAgdmFyIHgwID0gYXggPCBieCA/IChheCA8IGN4ID8gYXggOiBjeCkgOiAoYnggPCBjeCA/IGJ4IDogY3gpLFxuICAgICAgICB5MCA9IGF5IDwgYnkgPyAoYXkgPCBjeSA/IGF5IDogY3kpIDogKGJ5IDwgY3kgPyBieSA6IGN5KSxcbiAgICAgICAgeDEgPSBheCA+IGJ4ID8gKGF4ID4gY3ggPyBheCA6IGN4KSA6IChieCA+IGN4ID8gYnggOiBjeCksXG4gICAgICAgIHkxID0gYXkgPiBieSA/IChheSA+IGN5ID8gYXkgOiBjeSkgOiAoYnkgPiBjeSA/IGJ5IDogY3kpO1xuXG4gICAgdmFyIHAgPSBjLm5leHQ7XG4gICAgd2hpbGUgKHAgIT09IGEpIHtcbiAgICAgICAgaWYgKHAueCA+PSB4MCAmJiBwLnggPD0geDEgJiYgcC55ID49IHkwICYmIHAueSA8PSB5MSAmJlxuICAgICAgICAgICAgcG9pbnRJblRyaWFuZ2xlKGF4LCBheSwgYngsIGJ5LCBjeCwgY3ksIHAueCwgcC55KSAmJlxuICAgICAgICAgICAgYXJlYShwLnByZXYsIHAsIHAubmV4dCkgPj0gMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBwID0gcC5uZXh0O1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBpc0Vhckhhc2hlZChlYXIsIG1pblgsIG1pblksIGludlNpemUpIHtcbiAgICB2YXIgYSA9IGVhci5wcmV2LFxuICAgICAgICBiID0gZWFyLFxuICAgICAgICBjID0gZWFyLm5leHQ7XG5cbiAgICBpZiAoYXJlYShhLCBiLCBjKSA+PSAwKSByZXR1cm4gZmFsc2U7IC8vIHJlZmxleCwgY2FuJ3QgYmUgYW4gZWFyXG5cbiAgICB2YXIgYXggPSBhLngsIGJ4ID0gYi54LCBjeCA9IGMueCwgYXkgPSBhLnksIGJ5ID0gYi55LCBjeSA9IGMueTtcblxuICAgIC8vIHRyaWFuZ2xlIGJib3g7IG1pbiAmIG1heCBhcmUgY2FsY3VsYXRlZCBsaWtlIHRoaXMgZm9yIHNwZWVkXG4gICAgdmFyIHgwID0gYXggPCBieCA/IChheCA8IGN4ID8gYXggOiBjeCkgOiAoYnggPCBjeCA/IGJ4IDogY3gpLFxuICAgICAgICB5MCA9IGF5IDwgYnkgPyAoYXkgPCBjeSA/IGF5IDogY3kpIDogKGJ5IDwgY3kgPyBieSA6IGN5KSxcbiAgICAgICAgeDEgPSBheCA+IGJ4ID8gKGF4ID4gY3ggPyBheCA6IGN4KSA6IChieCA+IGN4ID8gYnggOiBjeCksXG4gICAgICAgIHkxID0gYXkgPiBieSA/IChheSA+IGN5ID8gYXkgOiBjeSkgOiAoYnkgPiBjeSA/IGJ5IDogY3kpO1xuXG4gICAgLy8gei1vcmRlciByYW5nZSBmb3IgdGhlIGN1cnJlbnQgdHJpYW5nbGUgYmJveDtcbiAgICB2YXIgbWluWiA9IHpPcmRlcih4MCwgeTAsIG1pblgsIG1pblksIGludlNpemUpLFxuICAgICAgICBtYXhaID0gek9yZGVyKHgxLCB5MSwgbWluWCwgbWluWSwgaW52U2l6ZSk7XG5cbiAgICB2YXIgcCA9IGVhci5wcmV2WixcbiAgICAgICAgbiA9IGVhci5uZXh0WjtcblxuICAgIC8vIGxvb2sgZm9yIHBvaW50cyBpbnNpZGUgdGhlIHRyaWFuZ2xlIGluIGJvdGggZGlyZWN0aW9uc1xuICAgIHdoaWxlIChwICYmIHAueiA+PSBtaW5aICYmIG4gJiYgbi56IDw9IG1heFopIHtcbiAgICAgICAgaWYgKHAueCA+PSB4MCAmJiBwLnggPD0geDEgJiYgcC55ID49IHkwICYmIHAueSA8PSB5MSAmJiBwICE9PSBhICYmIHAgIT09IGMgJiZcbiAgICAgICAgICAgIHBvaW50SW5UcmlhbmdsZShheCwgYXksIGJ4LCBieSwgY3gsIGN5LCBwLngsIHAueSkgJiYgYXJlYShwLnByZXYsIHAsIHAubmV4dCkgPj0gMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBwID0gcC5wcmV2WjtcblxuICAgICAgICBpZiAobi54ID49IHgwICYmIG4ueCA8PSB4MSAmJiBuLnkgPj0geTAgJiYgbi55IDw9IHkxICYmIG4gIT09IGEgJiYgbiAhPT0gYyAmJlxuICAgICAgICAgICAgcG9pbnRJblRyaWFuZ2xlKGF4LCBheSwgYngsIGJ5LCBjeCwgY3ksIG4ueCwgbi55KSAmJiBhcmVhKG4ucHJldiwgbiwgbi5uZXh0KSA+PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIG4gPSBuLm5leHRaO1xuICAgIH1cblxuICAgIC8vIGxvb2sgZm9yIHJlbWFpbmluZyBwb2ludHMgaW4gZGVjcmVhc2luZyB6LW9yZGVyXG4gICAgd2hpbGUgKHAgJiYgcC56ID49IG1pblopIHtcbiAgICAgICAgaWYgKHAueCA+PSB4MCAmJiBwLnggPD0geDEgJiYgcC55ID49IHkwICYmIHAueSA8PSB5MSAmJiBwICE9PSBhICYmIHAgIT09IGMgJiZcbiAgICAgICAgICAgIHBvaW50SW5UcmlhbmdsZShheCwgYXksIGJ4LCBieSwgY3gsIGN5LCBwLngsIHAueSkgJiYgYXJlYShwLnByZXYsIHAsIHAubmV4dCkgPj0gMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBwID0gcC5wcmV2WjtcbiAgICB9XG5cbiAgICAvLyBsb29rIGZvciByZW1haW5pbmcgcG9pbnRzIGluIGluY3JlYXNpbmcgei1vcmRlclxuICAgIHdoaWxlIChuICYmIG4ueiA8PSBtYXhaKSB7XG4gICAgICAgIGlmIChuLnggPj0geDAgJiYgbi54IDw9IHgxICYmIG4ueSA+PSB5MCAmJiBuLnkgPD0geTEgJiYgbiAhPT0gYSAmJiBuICE9PSBjICYmXG4gICAgICAgICAgICBwb2ludEluVHJpYW5nbGUoYXgsIGF5LCBieCwgYnksIGN4LCBjeSwgbi54LCBuLnkpICYmIGFyZWEobi5wcmV2LCBuLCBuLm5leHQpID49IDApIHJldHVybiBmYWxzZTtcbiAgICAgICAgbiA9IG4ubmV4dFo7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8vIGdvIHRocm91Z2ggYWxsIHBvbHlnb24gbm9kZXMgYW5kIGN1cmUgc21hbGwgbG9jYWwgc2VsZi1pbnRlcnNlY3Rpb25zXG5mdW5jdGlvbiBjdXJlTG9jYWxJbnRlcnNlY3Rpb25zKHN0YXJ0LCB0cmlhbmdsZXMsIGRpbSkge1xuICAgIHZhciBwID0gc3RhcnQ7XG4gICAgZG8ge1xuICAgICAgICB2YXIgYSA9IHAucHJldixcbiAgICAgICAgICAgIGIgPSBwLm5leHQubmV4dDtcblxuICAgICAgICBpZiAoIWVxdWFscyhhLCBiKSAmJiBpbnRlcnNlY3RzKGEsIHAsIHAubmV4dCwgYikgJiYgbG9jYWxseUluc2lkZShhLCBiKSAmJiBsb2NhbGx5SW5zaWRlKGIsIGEpKSB7XG5cbiAgICAgICAgICAgIHRyaWFuZ2xlcy5wdXNoKGEuaSAvIGRpbSB8IDApO1xuICAgICAgICAgICAgdHJpYW5nbGVzLnB1c2gocC5pIC8gZGltIHwgMCk7XG4gICAgICAgICAgICB0cmlhbmdsZXMucHVzaChiLmkgLyBkaW0gfCAwKTtcblxuICAgICAgICAgICAgLy8gcmVtb3ZlIHR3byBub2RlcyBpbnZvbHZlZFxuICAgICAgICAgICAgcmVtb3ZlTm9kZShwKTtcbiAgICAgICAgICAgIHJlbW92ZU5vZGUocC5uZXh0KTtcblxuICAgICAgICAgICAgcCA9IHN0YXJ0ID0gYjtcbiAgICAgICAgfVxuICAgICAgICBwID0gcC5uZXh0O1xuICAgIH0gd2hpbGUgKHAgIT09IHN0YXJ0KTtcblxuICAgIHJldHVybiBmaWx0ZXJQb2ludHMocCk7XG59XG5cbi8vIHRyeSBzcGxpdHRpbmcgcG9seWdvbiBpbnRvIHR3byBhbmQgdHJpYW5ndWxhdGUgdGhlbSBpbmRlcGVuZGVudGx5XG5mdW5jdGlvbiBzcGxpdEVhcmN1dChzdGFydCwgdHJpYW5nbGVzLCBkaW0sIG1pblgsIG1pblksIGludlNpemUpIHtcbiAgICAvLyBsb29rIGZvciBhIHZhbGlkIGRpYWdvbmFsIHRoYXQgZGl2aWRlcyB0aGUgcG9seWdvbiBpbnRvIHR3b1xuICAgIHZhciBhID0gc3RhcnQ7XG4gICAgZG8ge1xuICAgICAgICB2YXIgYiA9IGEubmV4dC5uZXh0O1xuICAgICAgICB3aGlsZSAoYiAhPT0gYS5wcmV2KSB7XG4gICAgICAgICAgICBpZiAoYS5pICE9PSBiLmkgJiYgaXNWYWxpZERpYWdvbmFsKGEsIGIpKSB7XG4gICAgICAgICAgICAgICAgLy8gc3BsaXQgdGhlIHBvbHlnb24gaW4gdHdvIGJ5IHRoZSBkaWFnb25hbFxuICAgICAgICAgICAgICAgIHZhciBjID0gc3BsaXRQb2x5Z29uKGEsIGIpO1xuXG4gICAgICAgICAgICAgICAgLy8gZmlsdGVyIGNvbGluZWFyIHBvaW50cyBhcm91bmQgdGhlIGN1dHNcbiAgICAgICAgICAgICAgICBhID0gZmlsdGVyUG9pbnRzKGEsIGEubmV4dCk7XG4gICAgICAgICAgICAgICAgYyA9IGZpbHRlclBvaW50cyhjLCBjLm5leHQpO1xuXG4gICAgICAgICAgICAgICAgLy8gcnVuIGVhcmN1dCBvbiBlYWNoIGhhbGZcbiAgICAgICAgICAgICAgICBlYXJjdXRMaW5rZWQoYSwgdHJpYW5nbGVzLCBkaW0sIG1pblgsIG1pblksIGludlNpemUsIDApO1xuICAgICAgICAgICAgICAgIGVhcmN1dExpbmtlZChjLCB0cmlhbmdsZXMsIGRpbSwgbWluWCwgbWluWSwgaW52U2l6ZSwgMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYiA9IGIubmV4dDtcbiAgICAgICAgfVxuICAgICAgICBhID0gYS5uZXh0O1xuICAgIH0gd2hpbGUgKGEgIT09IHN0YXJ0KTtcbn1cblxuLy8gbGluayBldmVyeSBob2xlIGludG8gdGhlIG91dGVyIGxvb3AsIHByb2R1Y2luZyBhIHNpbmdsZS1yaW5nIHBvbHlnb24gd2l0aG91dCBob2xlc1xuZnVuY3Rpb24gZWxpbWluYXRlSG9sZXMoZGF0YSwgaG9sZUluZGljZXMsIG91dGVyTm9kZSwgZGltKSB7XG4gICAgdmFyIHF1ZXVlID0gW10sXG4gICAgICAgIGksIGxlbiwgc3RhcnQsIGVuZCwgbGlzdDtcblxuICAgIGZvciAoaSA9IDAsIGxlbiA9IGhvbGVJbmRpY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHN0YXJ0ID0gaG9sZUluZGljZXNbaV0gKiBkaW07XG4gICAgICAgIGVuZCA9IGkgPCBsZW4gLSAxID8gaG9sZUluZGljZXNbaSArIDFdICogZGltIDogZGF0YS5sZW5ndGg7XG4gICAgICAgIGxpc3QgPSBsaW5rZWRMaXN0KGRhdGEsIHN0YXJ0LCBlbmQsIGRpbSwgZmFsc2UpO1xuICAgICAgICBpZiAobGlzdCA9PT0gbGlzdC5uZXh0KSBsaXN0LnN0ZWluZXIgPSB0cnVlO1xuICAgICAgICBxdWV1ZS5wdXNoKGdldExlZnRtb3N0KGxpc3QpKTtcbiAgICB9XG5cbiAgICBxdWV1ZS5zb3J0KGNvbXBhcmVYKTtcblxuICAgIC8vIHByb2Nlc3MgaG9sZXMgZnJvbSBsZWZ0IHRvIHJpZ2h0XG4gICAgZm9yIChpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dGVyTm9kZSA9IGVsaW1pbmF0ZUhvbGUocXVldWVbaV0sIG91dGVyTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dGVyTm9kZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZVgoYSwgYikge1xuICAgIHJldHVybiBhLnggLSBiLng7XG59XG5cbi8vIGZpbmQgYSBicmlkZ2UgYmV0d2VlbiB2ZXJ0aWNlcyB0aGF0IGNvbm5lY3RzIGhvbGUgd2l0aCBhbiBvdXRlciByaW5nIGFuZCBhbmQgbGluayBpdFxuZnVuY3Rpb24gZWxpbWluYXRlSG9sZShob2xlLCBvdXRlck5vZGUpIHtcbiAgICB2YXIgYnJpZGdlID0gZmluZEhvbGVCcmlkZ2UoaG9sZSwgb3V0ZXJOb2RlKTtcbiAgICBpZiAoIWJyaWRnZSkge1xuICAgICAgICByZXR1cm4gb3V0ZXJOb2RlO1xuICAgIH1cblxuICAgIHZhciBicmlkZ2VSZXZlcnNlID0gc3BsaXRQb2x5Z29uKGJyaWRnZSwgaG9sZSk7XG5cbiAgICAvLyBmaWx0ZXIgY29sbGluZWFyIHBvaW50cyBhcm91bmQgdGhlIGN1dHNcbiAgICBmaWx0ZXJQb2ludHMoYnJpZGdlUmV2ZXJzZSwgYnJpZGdlUmV2ZXJzZS5uZXh0KTtcbiAgICByZXR1cm4gZmlsdGVyUG9pbnRzKGJyaWRnZSwgYnJpZGdlLm5leHQpO1xufVxuXG4vLyBEYXZpZCBFYmVybHkncyBhbGdvcml0aG0gZm9yIGZpbmRpbmcgYSBicmlkZ2UgYmV0d2VlbiBob2xlIGFuZCBvdXRlciBwb2x5Z29uXG5mdW5jdGlvbiBmaW5kSG9sZUJyaWRnZShob2xlLCBvdXRlck5vZGUpIHtcbiAgICB2YXIgcCA9IG91dGVyTm9kZSxcbiAgICAgICAgaHggPSBob2xlLngsXG4gICAgICAgIGh5ID0gaG9sZS55LFxuICAgICAgICBxeCA9IC1JbmZpbml0eSxcbiAgICAgICAgbTtcblxuICAgIC8vIGZpbmQgYSBzZWdtZW50IGludGVyc2VjdGVkIGJ5IGEgcmF5IGZyb20gdGhlIGhvbGUncyBsZWZ0bW9zdCBwb2ludCB0byB0aGUgbGVmdDtcbiAgICAvLyBzZWdtZW50J3MgZW5kcG9pbnQgd2l0aCBsZXNzZXIgeCB3aWxsIGJlIHBvdGVudGlhbCBjb25uZWN0aW9uIHBvaW50XG4gICAgZG8ge1xuICAgICAgICBpZiAoaHkgPD0gcC55ICYmIGh5ID49IHAubmV4dC55ICYmIHAubmV4dC55ICE9PSBwLnkpIHtcbiAgICAgICAgICAgIHZhciB4ID0gcC54ICsgKGh5IC0gcC55KSAqIChwLm5leHQueCAtIHAueCkgLyAocC5uZXh0LnkgLSBwLnkpO1xuICAgICAgICAgICAgaWYgKHggPD0gaHggJiYgeCA+IHF4KSB7XG4gICAgICAgICAgICAgICAgcXggPSB4O1xuICAgICAgICAgICAgICAgIG0gPSBwLnggPCBwLm5leHQueCA/IHAgOiBwLm5leHQ7XG4gICAgICAgICAgICAgICAgaWYgKHggPT09IGh4KSByZXR1cm4gbTsgLy8gaG9sZSB0b3VjaGVzIG91dGVyIHNlZ21lbnQ7IHBpY2sgbGVmdG1vc3QgZW5kcG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwID0gcC5uZXh0O1xuICAgIH0gd2hpbGUgKHAgIT09IG91dGVyTm9kZSk7XG5cbiAgICBpZiAoIW0pIHJldHVybiBudWxsO1xuXG4gICAgLy8gbG9vayBmb3IgcG9pbnRzIGluc2lkZSB0aGUgdHJpYW5nbGUgb2YgaG9sZSBwb2ludCwgc2VnbWVudCBpbnRlcnNlY3Rpb24gYW5kIGVuZHBvaW50O1xuICAgIC8vIGlmIHRoZXJlIGFyZSBubyBwb2ludHMgZm91bmQsIHdlIGhhdmUgYSB2YWxpZCBjb25uZWN0aW9uO1xuICAgIC8vIG90aGVyd2lzZSBjaG9vc2UgdGhlIHBvaW50IG9mIHRoZSBtaW5pbXVtIGFuZ2xlIHdpdGggdGhlIHJheSBhcyBjb25uZWN0aW9uIHBvaW50XG5cbiAgICB2YXIgc3RvcCA9IG0sXG4gICAgICAgIG14ID0gbS54LFxuICAgICAgICBteSA9IG0ueSxcbiAgICAgICAgdGFuTWluID0gSW5maW5pdHksXG4gICAgICAgIHRhbjtcblxuICAgIHAgPSBtO1xuXG4gICAgZG8ge1xuICAgICAgICBpZiAoaHggPj0gcC54ICYmIHAueCA+PSBteCAmJiBoeCAhPT0gcC54ICYmXG4gICAgICAgICAgICAgICAgcG9pbnRJblRyaWFuZ2xlKGh5IDwgbXkgPyBoeCA6IHF4LCBoeSwgbXgsIG15LCBoeSA8IG15ID8gcXggOiBoeCwgaHksIHAueCwgcC55KSkge1xuXG4gICAgICAgICAgICB0YW4gPSBNYXRoLmFicyhoeSAtIHAueSkgLyAoaHggLSBwLngpOyAvLyB0YW5nZW50aWFsXG5cbiAgICAgICAgICAgIGlmIChsb2NhbGx5SW5zaWRlKHAsIGhvbGUpICYmXG4gICAgICAgICAgICAgICAgKHRhbiA8IHRhbk1pbiB8fCAodGFuID09PSB0YW5NaW4gJiYgKHAueCA+IG0ueCB8fCAocC54ID09PSBtLnggJiYgc2VjdG9yQ29udGFpbnNTZWN0b3IobSwgcCkpKSkpKSB7XG4gICAgICAgICAgICAgICAgbSA9IHA7XG4gICAgICAgICAgICAgICAgdGFuTWluID0gdGFuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcCA9IHAubmV4dDtcbiAgICB9IHdoaWxlIChwICE9PSBzdG9wKTtcblxuICAgIHJldHVybiBtO1xufVxuXG4vLyB3aGV0aGVyIHNlY3RvciBpbiB2ZXJ0ZXggbSBjb250YWlucyBzZWN0b3IgaW4gdmVydGV4IHAgaW4gdGhlIHNhbWUgY29vcmRpbmF0ZXNcbmZ1bmN0aW9uIHNlY3RvckNvbnRhaW5zU2VjdG9yKG0sIHApIHtcbiAgICByZXR1cm4gYXJlYShtLnByZXYsIG0sIHAucHJldikgPCAwICYmIGFyZWEocC5uZXh0LCBtLCBtLm5leHQpIDwgMDtcbn1cblxuLy8gaW50ZXJsaW5rIHBvbHlnb24gbm9kZXMgaW4gei1vcmRlclxuZnVuY3Rpb24gaW5kZXhDdXJ2ZShzdGFydCwgbWluWCwgbWluWSwgaW52U2l6ZSkge1xuICAgIHZhciBwID0gc3RhcnQ7XG4gICAgZG8ge1xuICAgICAgICBpZiAocC56ID09PSAwKSBwLnogPSB6T3JkZXIocC54LCBwLnksIG1pblgsIG1pblksIGludlNpemUpO1xuICAgICAgICBwLnByZXZaID0gcC5wcmV2O1xuICAgICAgICBwLm5leHRaID0gcC5uZXh0O1xuICAgICAgICBwID0gcC5uZXh0O1xuICAgIH0gd2hpbGUgKHAgIT09IHN0YXJ0KTtcblxuICAgIHAucHJldloubmV4dFogPSBudWxsO1xuICAgIHAucHJldlogPSBudWxsO1xuXG4gICAgc29ydExpbmtlZChwKTtcbn1cblxuLy8gU2ltb24gVGF0aGFtJ3MgbGlua2VkIGxpc3QgbWVyZ2Ugc29ydCBhbGdvcml0aG1cbi8vIGh0dHA6Ly93d3cuY2hpYXJrLmdyZWVuZW5kLm9yZy51ay9+c2d0YXRoYW0vYWxnb3JpdGhtcy9saXN0c29ydC5odG1sXG5mdW5jdGlvbiBzb3J0TGlua2VkKGxpc3QpIHtcbiAgICB2YXIgaSwgcCwgcSwgZSwgdGFpbCwgbnVtTWVyZ2VzLCBwU2l6ZSwgcVNpemUsXG4gICAgICAgIGluU2l6ZSA9IDE7XG5cbiAgICBkbyB7XG4gICAgICAgIHAgPSBsaXN0O1xuICAgICAgICBsaXN0ID0gbnVsbDtcbiAgICAgICAgdGFpbCA9IG51bGw7XG4gICAgICAgIG51bU1lcmdlcyA9IDA7XG5cbiAgICAgICAgd2hpbGUgKHApIHtcbiAgICAgICAgICAgIG51bU1lcmdlcysrO1xuICAgICAgICAgICAgcSA9IHA7XG4gICAgICAgICAgICBwU2l6ZSA9IDA7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW5TaXplOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwU2l6ZSsrO1xuICAgICAgICAgICAgICAgIHEgPSBxLm5leHRaO1xuICAgICAgICAgICAgICAgIGlmICghcSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxU2l6ZSA9IGluU2l6ZTtcblxuICAgICAgICAgICAgd2hpbGUgKHBTaXplID4gMCB8fCAocVNpemUgPiAwICYmIHEpKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAocFNpemUgIT09IDAgJiYgKHFTaXplID09PSAwIHx8ICFxIHx8IHAueiA8PSBxLnopKSB7XG4gICAgICAgICAgICAgICAgICAgIGUgPSBwO1xuICAgICAgICAgICAgICAgICAgICBwID0gcC5uZXh0WjtcbiAgICAgICAgICAgICAgICAgICAgcFNpemUtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlID0gcTtcbiAgICAgICAgICAgICAgICAgICAgcSA9IHEubmV4dFo7XG4gICAgICAgICAgICAgICAgICAgIHFTaXplLS07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRhaWwpIHRhaWwubmV4dFogPSBlO1xuICAgICAgICAgICAgICAgIGVsc2UgbGlzdCA9IGU7XG5cbiAgICAgICAgICAgICAgICBlLnByZXZaID0gdGFpbDtcbiAgICAgICAgICAgICAgICB0YWlsID0gZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcCA9IHE7XG4gICAgICAgIH1cblxuICAgICAgICB0YWlsLm5leHRaID0gbnVsbDtcbiAgICAgICAgaW5TaXplICo9IDI7XG5cbiAgICB9IHdoaWxlIChudW1NZXJnZXMgPiAxKTtcblxuICAgIHJldHVybiBsaXN0O1xufVxuXG4vLyB6LW9yZGVyIG9mIGEgcG9pbnQgZ2l2ZW4gY29vcmRzIGFuZCBpbnZlcnNlIG9mIHRoZSBsb25nZXIgc2lkZSBvZiBkYXRhIGJib3hcbmZ1bmN0aW9uIHpPcmRlcih4LCB5LCBtaW5YLCBtaW5ZLCBpbnZTaXplKSB7XG4gICAgLy8gY29vcmRzIGFyZSB0cmFuc2Zvcm1lZCBpbnRvIG5vbi1uZWdhdGl2ZSAxNS1iaXQgaW50ZWdlciByYW5nZVxuICAgIHggPSAoeCAtIG1pblgpICogaW52U2l6ZSB8IDA7XG4gICAgeSA9ICh5IC0gbWluWSkgKiBpbnZTaXplIHwgMDtcblxuICAgIHggPSAoeCB8ICh4IDw8IDgpKSAmIDB4MDBGRjAwRkY7XG4gICAgeCA9ICh4IHwgKHggPDwgNCkpICYgMHgwRjBGMEYwRjtcbiAgICB4ID0gKHggfCAoeCA8PCAyKSkgJiAweDMzMzMzMzMzO1xuICAgIHggPSAoeCB8ICh4IDw8IDEpKSAmIDB4NTU1NTU1NTU7XG5cbiAgICB5ID0gKHkgfCAoeSA8PCA4KSkgJiAweDAwRkYwMEZGO1xuICAgIHkgPSAoeSB8ICh5IDw8IDQpKSAmIDB4MEYwRjBGMEY7XG4gICAgeSA9ICh5IHwgKHkgPDwgMikpICYgMHgzMzMzMzMzMztcbiAgICB5ID0gKHkgfCAoeSA8PCAxKSkgJiAweDU1NTU1NTU1O1xuXG4gICAgcmV0dXJuIHggfCAoeSA8PCAxKTtcbn1cblxuLy8gZmluZCB0aGUgbGVmdG1vc3Qgbm9kZSBvZiBhIHBvbHlnb24gcmluZ1xuZnVuY3Rpb24gZ2V0TGVmdG1vc3Qoc3RhcnQpIHtcbiAgICB2YXIgcCA9IHN0YXJ0LFxuICAgICAgICBsZWZ0bW9zdCA9IHN0YXJ0O1xuICAgIGRvIHtcbiAgICAgICAgaWYgKHAueCA8IGxlZnRtb3N0LnggfHwgKHAueCA9PT0gbGVmdG1vc3QueCAmJiBwLnkgPCBsZWZ0bW9zdC55KSkgbGVmdG1vc3QgPSBwO1xuICAgICAgICBwID0gcC5uZXh0O1xuICAgIH0gd2hpbGUgKHAgIT09IHN0YXJ0KTtcblxuICAgIHJldHVybiBsZWZ0bW9zdDtcbn1cblxuLy8gY2hlY2sgaWYgYSBwb2ludCBsaWVzIHdpdGhpbiBhIGNvbnZleCB0cmlhbmdsZVxuZnVuY3Rpb24gcG9pbnRJblRyaWFuZ2xlKGF4LCBheSwgYngsIGJ5LCBjeCwgY3ksIHB4LCBweSkge1xuICAgIHJldHVybiAoY3ggLSBweCkgKiAoYXkgLSBweSkgPj0gKGF4IC0gcHgpICogKGN5IC0gcHkpICYmXG4gICAgICAgICAgIChheCAtIHB4KSAqIChieSAtIHB5KSA+PSAoYnggLSBweCkgKiAoYXkgLSBweSkgJiZcbiAgICAgICAgICAgKGJ4IC0gcHgpICogKGN5IC0gcHkpID49IChjeCAtIHB4KSAqIChieSAtIHB5KTtcbn1cblxuLy8gY2hlY2sgaWYgYSBkaWFnb25hbCBiZXR3ZWVuIHR3byBwb2x5Z29uIG5vZGVzIGlzIHZhbGlkIChsaWVzIGluIHBvbHlnb24gaW50ZXJpb3IpXG5mdW5jdGlvbiBpc1ZhbGlkRGlhZ29uYWwoYSwgYikge1xuICAgIHJldHVybiBhLm5leHQuaSAhPT0gYi5pICYmIGEucHJldi5pICE9PSBiLmkgJiYgIWludGVyc2VjdHNQb2x5Z29uKGEsIGIpICYmIC8vIGRvbmVzJ3QgaW50ZXJzZWN0IG90aGVyIGVkZ2VzXG4gICAgICAgICAgIChsb2NhbGx5SW5zaWRlKGEsIGIpICYmIGxvY2FsbHlJbnNpZGUoYiwgYSkgJiYgbWlkZGxlSW5zaWRlKGEsIGIpICYmIC8vIGxvY2FsbHkgdmlzaWJsZVxuICAgICAgICAgICAgKGFyZWEoYS5wcmV2LCBhLCBiLnByZXYpIHx8IGFyZWEoYSwgYi5wcmV2LCBiKSkgfHwgLy8gZG9lcyBub3QgY3JlYXRlIG9wcG9zaXRlLWZhY2luZyBzZWN0b3JzXG4gICAgICAgICAgICBlcXVhbHMoYSwgYikgJiYgYXJlYShhLnByZXYsIGEsIGEubmV4dCkgPiAwICYmIGFyZWEoYi5wcmV2LCBiLCBiLm5leHQpID4gMCk7IC8vIHNwZWNpYWwgemVyby1sZW5ndGggY2FzZVxufVxuXG4vLyBzaWduZWQgYXJlYSBvZiBhIHRyaWFuZ2xlXG5mdW5jdGlvbiBhcmVhKHAsIHEsIHIpIHtcbiAgICByZXR1cm4gKHEueSAtIHAueSkgKiAoci54IC0gcS54KSAtIChxLnggLSBwLngpICogKHIueSAtIHEueSk7XG59XG5cbi8vIGNoZWNrIGlmIHR3byBwb2ludHMgYXJlIGVxdWFsXG5mdW5jdGlvbiBlcXVhbHMocDEsIHAyKSB7XG4gICAgcmV0dXJuIHAxLnggPT09IHAyLnggJiYgcDEueSA9PT0gcDIueTtcbn1cblxuLy8gY2hlY2sgaWYgdHdvIHNlZ21lbnRzIGludGVyc2VjdFxuZnVuY3Rpb24gaW50ZXJzZWN0cyhwMSwgcTEsIHAyLCBxMikge1xuICAgIHZhciBvMSA9IHNpZ24oYXJlYShwMSwgcTEsIHAyKSk7XG4gICAgdmFyIG8yID0gc2lnbihhcmVhKHAxLCBxMSwgcTIpKTtcbiAgICB2YXIgbzMgPSBzaWduKGFyZWEocDIsIHEyLCBwMSkpO1xuICAgIHZhciBvNCA9IHNpZ24oYXJlYShwMiwgcTIsIHExKSk7XG5cbiAgICBpZiAobzEgIT09IG8yICYmIG8zICE9PSBvNCkgcmV0dXJuIHRydWU7IC8vIGdlbmVyYWwgY2FzZVxuXG4gICAgaWYgKG8xID09PSAwICYmIG9uU2VnbWVudChwMSwgcDIsIHExKSkgcmV0dXJuIHRydWU7IC8vIHAxLCBxMSBhbmQgcDIgYXJlIGNvbGxpbmVhciBhbmQgcDIgbGllcyBvbiBwMXExXG4gICAgaWYgKG8yID09PSAwICYmIG9uU2VnbWVudChwMSwgcTIsIHExKSkgcmV0dXJuIHRydWU7IC8vIHAxLCBxMSBhbmQgcTIgYXJlIGNvbGxpbmVhciBhbmQgcTIgbGllcyBvbiBwMXExXG4gICAgaWYgKG8zID09PSAwICYmIG9uU2VnbWVudChwMiwgcDEsIHEyKSkgcmV0dXJuIHRydWU7IC8vIHAyLCBxMiBhbmQgcDEgYXJlIGNvbGxpbmVhciBhbmQgcDEgbGllcyBvbiBwMnEyXG4gICAgaWYgKG80ID09PSAwICYmIG9uU2VnbWVudChwMiwgcTEsIHEyKSkgcmV0dXJuIHRydWU7IC8vIHAyLCBxMiBhbmQgcTEgYXJlIGNvbGxpbmVhciBhbmQgcTEgbGllcyBvbiBwMnEyXG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIGZvciBjb2xsaW5lYXIgcG9pbnRzIHAsIHEsIHIsIGNoZWNrIGlmIHBvaW50IHEgbGllcyBvbiBzZWdtZW50IHByXG5mdW5jdGlvbiBvblNlZ21lbnQocCwgcSwgcikge1xuICAgIHJldHVybiBxLnggPD0gTWF0aC5tYXgocC54LCByLngpICYmIHEueCA+PSBNYXRoLm1pbihwLngsIHIueCkgJiYgcS55IDw9IE1hdGgubWF4KHAueSwgci55KSAmJiBxLnkgPj0gTWF0aC5taW4ocC55LCByLnkpO1xufVxuXG5mdW5jdGlvbiBzaWduKG51bSkge1xuICAgIHJldHVybiBudW0gPiAwID8gMSA6IG51bSA8IDAgPyAtMSA6IDA7XG59XG5cbi8vIGNoZWNrIGlmIGEgcG9seWdvbiBkaWFnb25hbCBpbnRlcnNlY3RzIGFueSBwb2x5Z29uIHNlZ21lbnRzXG5mdW5jdGlvbiBpbnRlcnNlY3RzUG9seWdvbihhLCBiKSB7XG4gICAgdmFyIHAgPSBhO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKHAuaSAhPT0gYS5pICYmIHAubmV4dC5pICE9PSBhLmkgJiYgcC5pICE9PSBiLmkgJiYgcC5uZXh0LmkgIT09IGIuaSAmJlxuICAgICAgICAgICAgICAgIGludGVyc2VjdHMocCwgcC5uZXh0LCBhLCBiKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIHAgPSBwLm5leHQ7XG4gICAgfSB3aGlsZSAocCAhPT0gYSk7XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIGNoZWNrIGlmIGEgcG9seWdvbiBkaWFnb25hbCBpcyBsb2NhbGx5IGluc2lkZSB0aGUgcG9seWdvblxuZnVuY3Rpb24gbG9jYWxseUluc2lkZShhLCBiKSB7XG4gICAgcmV0dXJuIGFyZWEoYS5wcmV2LCBhLCBhLm5leHQpIDwgMCA/XG4gICAgICAgIGFyZWEoYSwgYiwgYS5uZXh0KSA+PSAwICYmIGFyZWEoYSwgYS5wcmV2LCBiKSA+PSAwIDpcbiAgICAgICAgYXJlYShhLCBiLCBhLnByZXYpIDwgMCB8fCBhcmVhKGEsIGEubmV4dCwgYikgPCAwO1xufVxuXG4vLyBjaGVjayBpZiB0aGUgbWlkZGxlIHBvaW50IG9mIGEgcG9seWdvbiBkaWFnb25hbCBpcyBpbnNpZGUgdGhlIHBvbHlnb25cbmZ1bmN0aW9uIG1pZGRsZUluc2lkZShhLCBiKSB7XG4gICAgdmFyIHAgPSBhLFxuICAgICAgICBpbnNpZGUgPSBmYWxzZSxcbiAgICAgICAgcHggPSAoYS54ICsgYi54KSAvIDIsXG4gICAgICAgIHB5ID0gKGEueSArIGIueSkgLyAyO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKCgocC55ID4gcHkpICE9PSAocC5uZXh0LnkgPiBweSkpICYmIHAubmV4dC55ICE9PSBwLnkgJiZcbiAgICAgICAgICAgICAgICAocHggPCAocC5uZXh0LnggLSBwLngpICogKHB5IC0gcC55KSAvIChwLm5leHQueSAtIHAueSkgKyBwLngpKVxuICAgICAgICAgICAgaW5zaWRlID0gIWluc2lkZTtcbiAgICAgICAgcCA9IHAubmV4dDtcbiAgICB9IHdoaWxlIChwICE9PSBhKTtcblxuICAgIHJldHVybiBpbnNpZGU7XG59XG5cbi8vIGxpbmsgdHdvIHBvbHlnb24gdmVydGljZXMgd2l0aCBhIGJyaWRnZTsgaWYgdGhlIHZlcnRpY2VzIGJlbG9uZyB0byB0aGUgc2FtZSByaW5nLCBpdCBzcGxpdHMgcG9seWdvbiBpbnRvIHR3bztcbi8vIGlmIG9uZSBiZWxvbmdzIHRvIHRoZSBvdXRlciByaW5nIGFuZCBhbm90aGVyIHRvIGEgaG9sZSwgaXQgbWVyZ2VzIGl0IGludG8gYSBzaW5nbGUgcmluZ1xuZnVuY3Rpb24gc3BsaXRQb2x5Z29uKGEsIGIpIHtcbiAgICB2YXIgYTIgPSBuZXcgTm9kZShhLmksIGEueCwgYS55KSxcbiAgICAgICAgYjIgPSBuZXcgTm9kZShiLmksIGIueCwgYi55KSxcbiAgICAgICAgYW4gPSBhLm5leHQsXG4gICAgICAgIGJwID0gYi5wcmV2O1xuXG4gICAgYS5uZXh0ID0gYjtcbiAgICBiLnByZXYgPSBhO1xuXG4gICAgYTIubmV4dCA9IGFuO1xuICAgIGFuLnByZXYgPSBhMjtcblxuICAgIGIyLm5leHQgPSBhMjtcbiAgICBhMi5wcmV2ID0gYjI7XG5cbiAgICBicC5uZXh0ID0gYjI7XG4gICAgYjIucHJldiA9IGJwO1xuXG4gICAgcmV0dXJuIGIyO1xufVxuXG4vLyBjcmVhdGUgYSBub2RlIGFuZCBvcHRpb25hbGx5IGxpbmsgaXQgd2l0aCBwcmV2aW91cyBvbmUgKGluIGEgY2lyY3VsYXIgZG91Ymx5IGxpbmtlZCBsaXN0KVxuZnVuY3Rpb24gaW5zZXJ0Tm9kZShpLCB4LCB5LCBsYXN0KSB7XG4gICAgdmFyIHAgPSBuZXcgTm9kZShpLCB4LCB5KTtcblxuICAgIGlmICghbGFzdCkge1xuICAgICAgICBwLnByZXYgPSBwO1xuICAgICAgICBwLm5leHQgPSBwO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgcC5uZXh0ID0gbGFzdC5uZXh0O1xuICAgICAgICBwLnByZXYgPSBsYXN0O1xuICAgICAgICBsYXN0Lm5leHQucHJldiA9IHA7XG4gICAgICAgIGxhc3QubmV4dCA9IHA7XG4gICAgfVxuICAgIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiByZW1vdmVOb2RlKHApIHtcbiAgICBwLm5leHQucHJldiA9IHAucHJldjtcbiAgICBwLnByZXYubmV4dCA9IHAubmV4dDtcblxuICAgIGlmIChwLnByZXZaKSBwLnByZXZaLm5leHRaID0gcC5uZXh0WjtcbiAgICBpZiAocC5uZXh0WikgcC5uZXh0Wi5wcmV2WiA9IHAucHJldlo7XG59XG5cbmZ1bmN0aW9uIE5vZGUoaSwgeCwgeSkge1xuICAgIC8vIHZlcnRleCBpbmRleCBpbiBjb29yZGluYXRlcyBhcnJheVxuICAgIHRoaXMuaSA9IGk7XG5cbiAgICAvLyB2ZXJ0ZXggY29vcmRpbmF0ZXNcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG5cbiAgICAvLyBwcmV2aW91cyBhbmQgbmV4dCB2ZXJ0ZXggbm9kZXMgaW4gYSBwb2x5Z29uIHJpbmdcbiAgICB0aGlzLnByZXYgPSBudWxsO1xuICAgIHRoaXMubmV4dCA9IG51bGw7XG5cbiAgICAvLyB6LW9yZGVyIGN1cnZlIHZhbHVlXG4gICAgdGhpcy56ID0gMDtcblxuICAgIC8vIHByZXZpb3VzIGFuZCBuZXh0IG5vZGVzIGluIHotb3JkZXJcbiAgICB0aGlzLnByZXZaID0gbnVsbDtcbiAgICB0aGlzLm5leHRaID0gbnVsbDtcblxuICAgIC8vIGluZGljYXRlcyB3aGV0aGVyIHRoaXMgaXMgYSBzdGVpbmVyIHBvaW50XG4gICAgdGhpcy5zdGVpbmVyID0gZmFsc2U7XG59XG5cbi8vIHJldHVybiBhIHBlcmNlbnRhZ2UgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBwb2x5Z29uIGFyZWEgYW5kIGl0cyB0cmlhbmd1bGF0aW9uIGFyZWE7XG4vLyB1c2VkIHRvIHZlcmlmeSBjb3JyZWN0bmVzcyBvZiB0cmlhbmd1bGF0aW9uXG5lYXJjdXQuZGV2aWF0aW9uID0gZnVuY3Rpb24gKGRhdGEsIGhvbGVJbmRpY2VzLCBkaW0sIHRyaWFuZ2xlcykge1xuICAgIHZhciBoYXNIb2xlcyA9IGhvbGVJbmRpY2VzICYmIGhvbGVJbmRpY2VzLmxlbmd0aDtcbiAgICB2YXIgb3V0ZXJMZW4gPSBoYXNIb2xlcyA/IGhvbGVJbmRpY2VzWzBdICogZGltIDogZGF0YS5sZW5ndGg7XG5cbiAgICB2YXIgcG9seWdvbkFyZWEgPSBNYXRoLmFicyhzaWduZWRBcmVhKGRhdGEsIDAsIG91dGVyTGVuLCBkaW0pKTtcbiAgICBpZiAoaGFzSG9sZXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGhvbGVJbmRpY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBob2xlSW5kaWNlc1tpXSAqIGRpbTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBpIDwgbGVuIC0gMSA/IGhvbGVJbmRpY2VzW2kgKyAxXSAqIGRpbSA6IGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgcG9seWdvbkFyZWEgLT0gTWF0aC5hYnMoc2lnbmVkQXJlYShkYXRhLCBzdGFydCwgZW5kLCBkaW0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmlhbmdsZXNBcmVhID0gMDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdHJpYW5nbGVzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIHZhciBhID0gdHJpYW5nbGVzW2ldICogZGltO1xuICAgICAgICB2YXIgYiA9IHRyaWFuZ2xlc1tpICsgMV0gKiBkaW07XG4gICAgICAgIHZhciBjID0gdHJpYW5nbGVzW2kgKyAyXSAqIGRpbTtcbiAgICAgICAgdHJpYW5nbGVzQXJlYSArPSBNYXRoLmFicyhcbiAgICAgICAgICAgIChkYXRhW2FdIC0gZGF0YVtjXSkgKiAoZGF0YVtiICsgMV0gLSBkYXRhW2EgKyAxXSkgLVxuICAgICAgICAgICAgKGRhdGFbYV0gLSBkYXRhW2JdKSAqIChkYXRhW2MgKyAxXSAtIGRhdGFbYSArIDFdKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBvbHlnb25BcmVhID09PSAwICYmIHRyaWFuZ2xlc0FyZWEgPT09IDAgPyAwIDpcbiAgICAgICAgTWF0aC5hYnMoKHRyaWFuZ2xlc0FyZWEgLSBwb2x5Z29uQXJlYSkgLyBwb2x5Z29uQXJlYSk7XG59O1xuXG5mdW5jdGlvbiBzaWduZWRBcmVhKGRhdGEsIHN0YXJ0LCBlbmQsIGRpbSkge1xuICAgIHZhciBzdW0gPSAwO1xuICAgIGZvciAodmFyIGkgPSBzdGFydCwgaiA9IGVuZCAtIGRpbTsgaSA8IGVuZDsgaSArPSBkaW0pIHtcbiAgICAgICAgc3VtICs9IChkYXRhW2pdIC0gZGF0YVtpXSkgKiAoZGF0YVtpICsgMV0gKyBkYXRhW2ogKyAxXSk7XG4gICAgICAgIGogPSBpO1xuICAgIH1cbiAgICByZXR1cm4gc3VtO1xufVxuXG4vLyB0dXJuIGEgcG9seWdvbiBpbiBhIG11bHRpLWRpbWVuc2lvbmFsIGFycmF5IGZvcm0gKGUuZy4gYXMgaW4gR2VvSlNPTikgaW50byBhIGZvcm0gRWFyY3V0IGFjY2VwdHNcbmVhcmN1dC5mbGF0dGVuID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZGltID0gZGF0YVswXVswXS5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IHt2ZXJ0aWNlczogW10sIGhvbGVzOiBbXSwgZGltZW5zaW9uczogZGltfSxcbiAgICAgICAgaG9sZUluZGV4ID0gMDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGRhdGFbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgZGltOyBkKyspIHJlc3VsdC52ZXJ0aWNlcy5wdXNoKGRhdGFbaV1bal1bZF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgaG9sZUluZGV4ICs9IGRhdGFbaSAtIDFdLmxlbmd0aDtcbiAgICAgICAgICAgIHJlc3VsdC5ob2xlcy5wdXNoKGhvbGVJbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/earcut/src/earcut.js\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/constants/kanto.ts":
/*!********************************!*\
  !*** ./lib/constants/kanto.ts ***!
  \********************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   BASE_PATH: function() { return /* binding */ BASE_PATH; },\n/* harmony export */   DEFAULT_PARAMS: function() { return /* binding */ DEFAULT_PARAMS; },\n/* harmony export */   DEM_TILE_URL: function() { return /* binding */ DEM_TILE_URL; },\n/* harmony export */   KANTO_PREFECTURES: function() { return /* binding */ KANTO_PREFECTURES; },\n/* harmony export */   METERS_PER_DEGREE: function() { return /* binding */ METERS_PER_DEGREE; },\n/* harmony export */   PROJ_CENTER: function() { return /* binding */ PROJ_CENTER; },\n/* harmony export */   TOKYO_PUZZLE_BBOX: function() { return /* binding */ TOKYO_PUZZLE_BBOX; }\n/* harmony export */ });\nconst KANTO_PREFECTURES = [\n    {\n        code: \"08\",\n        name: \"茨城県\",\n        capital: \"水戸\",\n        nameEn: \"Ibaraki\",\n        capitalEn: \"Mito\",\n        color: \"#4ade80\"\n    },\n    {\n        code: \"09\",\n        name: \"栃木県\",\n        capital: \"宇都宮\",\n        nameEn: \"Tochigi\",\n        capitalEn: \"Utsunomiya\",\n        color: \"#60a5fa\"\n    },\n    {\n        code: \"10\",\n        name: \"群馬県\",\n        capital: \"前橋\",\n        nameEn: \"Gunma\",\n        capitalEn: \"Maebashi\",\n        color: \"#f97316\"\n    },\n    {\n        code: \"11\",\n        name: \"埼玉県\",\n        capital: \"さいたま\",\n        nameEn: \"Saitama\",\n        capitalEn: \"Saitama\",\n        color: \"#a78bfa\"\n    },\n    {\n        code: \"12\",\n        name: \"千葉県\",\n        capital: \"千葉\",\n        nameEn: \"Chiba\",\n        capitalEn: \"Chiba\",\n        color: \"#fb923c\"\n    },\n    {\n        code: \"13\",\n        name: \"東京都\",\n        capital: \"東京\",\n        nameEn: \"Tokyo\",\n        capitalEn: \"Tokyo\",\n        color: \"#f43f5e\"\n    },\n    {\n        code: \"14\",\n        name: \"神奈川県\",\n        capital: \"横浜\",\n        nameEn: \"Kanagawa\",\n        capitalEn: \"Yokohama\",\n        color: \"#facc15\"\n    }\n];\nconst TOKYO_PUZZLE_BBOX = {\n    minLon: 138.9,\n    maxLon: 139.95,\n    minLat: 35.4,\n    maxLat: 35.9\n};\nconst PROJ_CENTER = {\n    lat: 36.0,\n    lon: 139.0\n};\nconst METERS_PER_DEGREE = 111320;\nconst BASE_PATH =  false ? 0 : \"\";\nconst DEM_TILE_URL = \"https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt\";\nconst DEFAULT_PARAMS = {\n    zoom: 12,\n    xyScale: 1 / 50000,\n    zScale: 2.0,\n    baseThickness: 3.0,\n    clearance: 0.2,\n    decimation: 1,\n    smoothing: false,\n    noDataFill: \"sea\",\n    includeIslands: false,\n    minIslandArea: 1.0,\n    textMode: \"emboss\",\n    textDepth: 0.5,\n    fontSize: 12,\n    textMargin: 2\n};\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2xpYi9jb25zdGFudHMva2FudG8udHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUVPLE1BQU1BLG9CQUFzQztJQUNqRDtRQUFFQyxNQUFLO1FBQU1DLE1BQUs7UUFBUUMsU0FBUTtRQUFVQyxRQUFPO1FBQVlDLFdBQVU7UUFBY0MsT0FBTTtJQUFVO0lBQ3ZHO1FBQUVMLE1BQUs7UUFBTUMsTUFBSztRQUFRQyxTQUFRO1FBQVNDLFFBQU87UUFBWUMsV0FBVTtRQUFjQyxPQUFNO0lBQVU7SUFDdEc7UUFBRUwsTUFBSztRQUFNQyxNQUFLO1FBQVFDLFNBQVE7UUFBVUMsUUFBTztRQUFZQyxXQUFVO1FBQWNDLE9BQU07SUFBVTtJQUN2RztRQUFFTCxNQUFLO1FBQU1DLE1BQUs7UUFBUUMsU0FBUTtRQUFRQyxRQUFPO1FBQVlDLFdBQVU7UUFBY0MsT0FBTTtJQUFVO0lBQ3JHO1FBQUVMLE1BQUs7UUFBTUMsTUFBSztRQUFRQyxTQUFRO1FBQVVDLFFBQU87UUFBWUMsV0FBVTtRQUFjQyxPQUFNO0lBQVU7SUFDdkc7UUFBRUwsTUFBSztRQUFNQyxNQUFLO1FBQVFDLFNBQVE7UUFBVUMsUUFBTztRQUFZQyxXQUFVO1FBQWNDLE9BQU07SUFBVTtJQUN2RztRQUFFTCxNQUFLO1FBQU1DLE1BQUs7UUFBUUMsU0FBUTtRQUFTQyxRQUFPO1FBQVlDLFdBQVU7UUFBY0MsT0FBTTtJQUFVO0NBQ3ZHLENBQUM7QUFFSyxNQUFNQyxvQkFBMEI7SUFBRUMsUUFBTztJQUFPQyxRQUFPO0lBQVFDLFFBQU87SUFBTUMsUUFBTztBQUFLLEVBQUU7QUFFMUYsTUFBTUMsY0FBYztJQUFFQyxLQUFLO0lBQU1DLEtBQUs7QUFBTSxFQUFFO0FBQzlDLE1BQU1DLG9CQUFvQixPQUFPO0FBRWpDLE1BQU1DLFlBQVlDLE1BQXlCLEdBQWUsSUFBaUIsR0FBRztBQUU5RSxNQUFNQyxlQUFlLDJEQUEyRDtBQUVoRixNQUFNQyxpQkFBaUI7SUFDNUJDLE1BQU07SUFDTkMsU0FBUyxJQUFJO0lBQ2JDLFFBQVE7SUFDUkMsZUFBZTtJQUNmQyxXQUFXO0lBQ1hDLFlBQVk7SUFDWkMsV0FBVztJQUNYQyxZQUFZO0lBQ1pDLGdCQUFnQjtJQUNoQkMsZUFBZTtJQUNmQyxVQUFVO0lBQ1ZDLFdBQVc7SUFDWEMsVUFBVTtJQUNWQyxZQUFZO0FBQ2QsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9saWIvY29uc3RhbnRzL2thbnRvLnRzPzU4M2MiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBQcmVmZWN0dXJlSW5mbywgQkJveCB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IEtBTlRPX1BSRUZFQ1RVUkVTOiBQcmVmZWN0dXJlSW5mb1tdID0gW1xuICB7IGNvZGU6JzA4JywgbmFtZTon6Iyo5Z+O55yMJywgIGNhcGl0YWw6J+awtOaIuCcsICAgICBuYW1lRW46J0liYXJha2knLCAgY2FwaXRhbEVuOidNaXRvJywgICAgICAgY29sb3I6JyM0YWRlODAnIH0sXG4gIHsgY29kZTonMDknLCBuYW1lOifmoIPmnKjnnIwnLCAgY2FwaXRhbDon5a6H6YO95a6uJywgICBuYW1lRW46J1RvY2hpZ2knLCAgY2FwaXRhbEVuOidVdHN1bm9taXlhJywgY29sb3I6JyM2MGE1ZmEnIH0sXG4gIHsgY29kZTonMTAnLCBuYW1lOifnvqTppqznnIwnLCAgY2FwaXRhbDon5YmN5qmLJywgICAgIG5hbWVFbjonR3VubWEnLCAgICBjYXBpdGFsRW46J01hZWJhc2hpJywgICBjb2xvcjonI2Y5NzMxNicgfSxcbiAgeyBjb2RlOicxMScsIG5hbWU6J+WfvOeOieecjCcsICBjYXBpdGFsOifjgZXjgYTjgZ/jgb4nLCBuYW1lRW46J1NhaXRhbWEnLCAgY2FwaXRhbEVuOidTYWl0YW1hJywgICAgY29sb3I6JyNhNzhiZmEnIH0sXG4gIHsgY29kZTonMTInLCBuYW1lOifljYPokYnnnIwnLCAgY2FwaXRhbDon5Y2D6JGJJywgICAgIG5hbWVFbjonQ2hpYmEnLCAgICBjYXBpdGFsRW46J0NoaWJhJywgICAgICBjb2xvcjonI2ZiOTIzYycgfSxcbiAgeyBjb2RlOicxMycsIG5hbWU6J+adseS6rOmDvScsICBjYXBpdGFsOifmnbHkuqwnLCAgICAgbmFtZUVuOidUb2t5bycsICAgIGNhcGl0YWxFbjonVG9reW8nLCAgICAgIGNvbG9yOicjZjQzZjVlJyB9LFxuICB7IGNvZGU6JzE0JywgbmFtZTon56We5aWI5bed55yMJywgY2FwaXRhbDon5qiq5rWcJywgICAgbmFtZUVuOidLYW5hZ2F3YScsIGNhcGl0YWxFbjonWW9rb2hhbWEnLCAgIGNvbG9yOicjZmFjYzE1JyB9LFxuXTtcblxuZXhwb3J0IGNvbnN0IFRPS1lPX1BVWlpMRV9CQk9YOiBCQm94ID0geyBtaW5Mb246MTM4LjksIG1heExvbjoxMzkuOTUsIG1pbkxhdDozNS40LCBtYXhMYXQ6MzUuOSB9O1xuXG5leHBvcnQgY29uc3QgUFJPSl9DRU5URVIgPSB7IGxhdDogMzYuMCwgbG9uOiAxMzkuMCB9O1xuZXhwb3J0IGNvbnN0IE1FVEVSU19QRVJfREVHUkVFID0gMTExMzIwO1xuXG5leHBvcnQgY29uc3QgQkFTRV9QQVRIID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/ICcvcHJlZi1wdXp6bGUnIDogJyc7XG5cbmV4cG9ydCBjb25zdCBERU1fVElMRV9VUkwgPSAnaHR0cHM6Ly9jeWJlcmphcGFuZGF0YS5nc2kuZ28uanAveHl6L2RlbS97en0ve3h9L3t5fS50eHQnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QQVJBTVMgPSB7XG4gIHpvb206IDEyIGFzIGNvbnN0LFxuICB4eVNjYWxlOiAxIC8gNTAwMDAsXG4gIHpTY2FsZTogMi4wLFxuICBiYXNlVGhpY2tuZXNzOiAzLjAsXG4gIGNsZWFyYW5jZTogMC4yLFxuICBkZWNpbWF0aW9uOiAxLFxuICBzbW9vdGhpbmc6IGZhbHNlLFxuICBub0RhdGFGaWxsOiAnc2VhJyBhcyBjb25zdCxcbiAgaW5jbHVkZUlzbGFuZHM6IGZhbHNlLFxuICBtaW5Jc2xhbmRBcmVhOiAxLjAsXG4gIHRleHRNb2RlOiAnZW1ib3NzJyBhcyBjb25zdCxcbiAgdGV4dERlcHRoOiAwLjUsXG4gIGZvbnRTaXplOiAxMixcbiAgdGV4dE1hcmdpbjogMixcbn07XG4iXSwibmFtZXMiOlsiS0FOVE9fUFJFRkVDVFVSRVMiLCJjb2RlIiwibmFtZSIsImNhcGl0YWwiLCJuYW1lRW4iLCJjYXBpdGFsRW4iLCJjb2xvciIsIlRPS1lPX1BVWlpMRV9CQk9YIiwibWluTG9uIiwibWF4TG9uIiwibWluTGF0IiwibWF4TGF0IiwiUFJPSl9DRU5URVIiLCJsYXQiLCJsb24iLCJNRVRFUlNfUEVSX0RFR1JFRSIsIkJBU0VfUEFUSCIsInByb2Nlc3MiLCJERU1fVElMRV9VUkwiLCJERUZBVUxUX1BBUkFNUyIsInpvb20iLCJ4eVNjYWxlIiwielNjYWxlIiwiYmFzZVRoaWNrbmVzcyIsImNsZWFyYW5jZSIsImRlY2ltYXRpb24iLCJzbW9vdGhpbmciLCJub0RhdGFGaWxsIiwiaW5jbHVkZUlzbGFuZHMiLCJtaW5Jc2xhbmRBcmVhIiwidGV4dE1vZGUiLCJ0ZXh0RGVwdGgiLCJmb250U2l6ZSIsInRleHRNYXJnaW4iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/constants/kanto.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/geo/clip.ts":
/*!*************************!*\
  !*** ./lib/geo/clip.ts ***!
  \*************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   clipDemToPolygon: function() { return /* binding */ clipDemToPolygon; },\n/* harmony export */   computeWorldGrid: function() { return /* binding */ computeWorldGrid; }\n/* harmony export */ });\n/* harmony import */ var _projection__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./projection */ \"(app-pages-browser)/./lib/geo/projection.ts\");\n\nfunction pointInRing(lon, lat, ring) {\n    let inside = false;\n    for(let i = 0, j = ring.length - 1; i < ring.length; j = i++){\n        const xi = ring[i][0], yi = ring[i][1];\n        const xj = ring[j][0], yj = ring[j][1];\n        if (yi > lat !== yj > lat && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {\n            inside = !inside;\n        }\n    }\n    return inside;\n}\nfunction pointInPolygon(lon, lat, rings) {\n    if (!rings.length) return false;\n    if (!pointInRing(lon, lat, rings[0])) return false;\n    for(let i = 1; i < rings.length; i++){\n        if (pointInRing(lon, lat, rings[i])) return false;\n    }\n    return true;\n}\nfunction clipDemToPolygon(demGrid, polygons) {\n    const { bbox, cols, rows, values } = demGrid;\n    const lonStep = (bbox.maxLon - bbox.minLon) / cols;\n    const latStep = (bbox.maxLat - bbox.minLat) / rows;\n    const clipped = new Float32Array(rows * cols).fill(NaN);\n    // Flatten all rings from all polygons for scanline rasterization.\n    // Even-odd rule correctly handles outer rings + holes + multiple polygons.\n    const allRings = polygons.flat();\n    for(let r = 0; r < rows; r++){\n        const lat = bbox.maxLat - (r + 0.5) * latStep;\n        // Collect x-intersections of all ring edges at this latitude\n        const xs = [];\n        for (const ring of allRings){\n            for(let i = 0, j = ring.length - 1; i < ring.length; j = i++){\n                const yi = ring[i][1], yj = ring[j][1];\n                if (yi > lat !== yj > lat) {\n                    const xi = ring[i][0], xj = ring[j][0];\n                    xs.push(xi + (lat - yi) * (xj - xi) / (yj - yi));\n                }\n            }\n        }\n        xs.sort((a, b)=>a - b);\n        // Fill between pairs of intersections (even-odd fill)\n        for(let k = 0; k + 1 < xs.length; k += 2){\n            const cStart = Math.max(0, Math.ceil((xs[k] - bbox.minLon) / lonStep - 0.5));\n            const cEnd = Math.min(cols - 1, Math.floor((xs[k + 1] - bbox.minLon) / lonStep - 0.5));\n            for(let c = cStart; c <= cEnd; c++){\n                clipped[r * cols + c] = values[r * cols + c];\n            }\n        }\n    }\n    return {\n        bbox,\n        cols,\n        rows,\n        values: clipped\n    };\n}\nfunction computeWorldGrid(demGrid, params) {\n    const { bbox, cols, rows, values } = demGrid;\n    const lonStep = (bbox.maxLon - bbox.minLon) / cols;\n    const latStep = (bbox.maxLat - bbox.minLat) / rows;\n    const wx = new Float32Array(rows * cols);\n    const wy = new Float32Array(rows * cols);\n    const wz = new Float32Array(rows * cols);\n    for(let r = 0; r < rows; r++){\n        const lat = bbox.maxLat - (r + 0.5) * latStep;\n        for(let c = 0; c < cols; c++){\n            const lon = bbox.minLon + (c + 0.5) * lonStep;\n            const { x, y } = (0,_projection__WEBPACK_IMPORTED_MODULE_0__.lonLatToWorld)(lon, lat, params);\n            const elev = values[r * cols + c];\n            wx[r * cols + c] = x;\n            wy[r * cols + c] = y;\n            wz[r * cols + c] = isNaN(elev) ? NaN : elev * params.zScale * params.xyScale;\n        }\n    }\n    return {\n        wx,\n        wy,\n        wz\n    };\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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RSxJQUFLVDtRQUN0QyxJQUFLLElBQUl1QixJQUFJLEdBQUdBLElBQUk3QixNQUFNNkIsSUFBSztZQUM3QixNQUFNOUMsTUFBTWdCLEtBQUtNLE1BQU0sR0FBRyxDQUFDd0IsSUFBSSxHQUFFLElBQUsxQjtZQUN0QyxNQUFNLEVBQUVnQyxDQUFDLEVBQUVDLENBQUMsRUFBRSxHQUFHdkQsMERBQWFBLENBQUNFLEtBQUtDLEtBQUsrQztZQUN6QyxNQUFNTSxPQUFPbkMsTUFBTSxDQUFDYSxJQUFJZixPQUFPNkIsRUFBRTtZQUNqQ0csRUFBRSxDQUFDakIsSUFBSWYsT0FBTzZCLEVBQUUsR0FBR007WUFDbkJGLEVBQUUsQ0FBQ2xCLElBQUlmLE9BQU82QixFQUFFLEdBQUdPO1lBQ25CRixFQUFFLENBQUNuQixJQUFJZixPQUFPNkIsRUFBRSxHQUFHUyxNQUFNRCxRQUFRekIsTUFBTXlCLE9BQU9OLE9BQU9RLE1BQU0sR0FBR1IsT0FBT1MsT0FBTztRQUM5RTtJQUNGO0lBQ0EsT0FBTztRQUFFUjtRQUFJQztRQUFJQztJQUFHO0FBQ3RCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL2xpYi9nZW8vY2xpcC50cz82Y2JiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgQkJveCwgRGVtR3JpZCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGxvbkxhdFRvV29ybGQgfSBmcm9tICcuL3Byb2plY3Rpb24nO1xuaW1wb3J0IHR5cGUgeyBNZXNoR2VuZXJhdGlvblBhcmFtcyB9IGZyb20gJy4uL3R5cGVzJztcblxudHlwZSBSaW5nID0gW251bWJlciwgbnVtYmVyXVtdO1xuXG5mdW5jdGlvbiBwb2ludEluUmluZyhsb246IG51bWJlciwgbGF0OiBudW1iZXIsIHJpbmc6IFJpbmcpOiBib29sZWFuIHtcbiAgbGV0IGluc2lkZSA9IGZhbHNlO1xuICBmb3IgKGxldCBpID0gMCwgaiA9IHJpbmcubGVuZ3RoIC0gMTsgaSA8IHJpbmcubGVuZ3RoOyBqID0gaSsrKSB7XG4gICAgY29uc3QgeGkgPSByaW5nW2ldWzBdLCB5aSA9IHJpbmdbaV1bMV07XG4gICAgY29uc3QgeGogPSByaW5nW2pdWzBdLCB5aiA9IHJpbmdbal1bMV07XG4gICAgaWYgKCgoeWkgPiBsYXQpICE9PSAoeWogPiBsYXQpKSAmJiAobG9uIDwgKHhqIC0geGkpICogKGxhdCAtIHlpKSAvICh5aiAtIHlpKSArIHhpKSkge1xuICAgICAgaW5zaWRlID0gIWluc2lkZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGluc2lkZTtcbn1cblxuZnVuY3Rpb24gcG9pbnRJblBvbHlnb24obG9uOiBudW1iZXIsIGxhdDogbnVtYmVyLCByaW5nczogUmluZ1tdKTogYm9vbGVhbiB7XG4gIGlmICghcmluZ3MubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGlmICghcG9pbnRJblJpbmcobG9uLCBsYXQsIHJpbmdzWzBdKSkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHBvaW50SW5SaW5nKGxvbiwgbGF0LCByaW5nc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsaXBEZW1Ub1BvbHlnb24oXG4gIGRlbUdyaWQ6IERlbUdyaWQsXG4gIHBvbHlnb25zOiBSaW5nW11bXSxcbik6IERlbUdyaWQge1xuICBjb25zdCB7IGJib3gsIGNvbHMsIHJvd3MsIHZhbHVlcyB9ID0gZGVtR3JpZDtcbiAgY29uc3QgbG9uU3RlcCA9IChiYm94Lm1heExvbiAtIGJib3gubWluTG9uKSAvIGNvbHM7XG4gIGNvbnN0IGxhdFN0ZXAgPSAoYmJveC5tYXhMYXQgLSBiYm94Lm1pbkxhdCkgLyByb3dzO1xuICBjb25zdCBjbGlwcGVkID0gbmV3IEZsb2F0MzJBcnJheShyb3dzICogY29scykuZmlsbChOYU4pO1xuXG4gIC8vIEZsYXR0ZW4gYWxsIHJpbmdzIGZyb20gYWxsIHBvbHlnb25zIGZvciBzY2FubGluZSByYXN0ZXJpemF0aW9uLlxuICAvLyBFdmVuLW9kZCBydWxlIGNvcnJlY3RseSBoYW5kbGVzIG91dGVyIHJpbmdzICsgaG9sZXMgKyBtdWx0aXBsZSBwb2x5Z29ucy5cbiAgY29uc3QgYWxsUmluZ3M6IFJpbmdbXSA9IHBvbHlnb25zLmZsYXQoKTtcblxuICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIrKykge1xuICAgIGNvbnN0IGxhdCA9IGJib3gubWF4TGF0IC0gKHIgKyAwLjUpICogbGF0U3RlcDtcblxuICAgIC8vIENvbGxlY3QgeC1pbnRlcnNlY3Rpb25zIG9mIGFsbCByaW5nIGVkZ2VzIGF0IHRoaXMgbGF0aXR1ZGVcbiAgICBjb25zdCB4czogbnVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJpbmcgb2YgYWxsUmluZ3MpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBqID0gcmluZy5sZW5ndGggLSAxOyBpIDwgcmluZy5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgICAgY29uc3QgeWkgPSByaW5nW2ldWzFdLCB5aiA9IHJpbmdbal1bMV07XG4gICAgICAgIGlmICgoeWkgPiBsYXQpICE9PSAoeWogPiBsYXQpKSB7XG4gICAgICAgICAgY29uc3QgeGkgPSByaW5nW2ldWzBdLCB4aiA9IHJpbmdbal1bMF07XG4gICAgICAgICAgeHMucHVzaCh4aSArIChsYXQgLSB5aSkgKiAoeGogLSB4aSkgLyAoeWogLSB5aSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHhzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcblxuICAgIC8vIEZpbGwgYmV0d2VlbiBwYWlycyBvZiBpbnRlcnNlY3Rpb25zIChldmVuLW9kZCBmaWxsKVxuICAgIGZvciAobGV0IGsgPSAwOyBrICsgMSA8IHhzLmxlbmd0aDsgayArPSAyKSB7XG4gICAgICBjb25zdCBjU3RhcnQgPSBNYXRoLm1heCgwLCBNYXRoLmNlaWwoKHhzW2tdICAgLSBiYm94Lm1pbkxvbikgLyBsb25TdGVwIC0gMC41KSk7XG4gICAgICBjb25zdCBjRW5kICAgPSBNYXRoLm1pbihjb2xzIC0gMSwgTWF0aC5mbG9vcigoeHNbaysxXSAtIGJib3gubWluTG9uKSAvIGxvblN0ZXAgLSAwLjUpKTtcbiAgICAgIGZvciAobGV0IGMgPSBjU3RhcnQ7IGMgPD0gY0VuZDsgYysrKSB7XG4gICAgICAgIGNsaXBwZWRbciAqIGNvbHMgKyBjXSA9IHZhbHVlc1tyICogY29scyArIGNdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4geyBiYm94LCBjb2xzLCByb3dzLCB2YWx1ZXM6IGNsaXBwZWQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVXb3JsZEdyaWQoXG4gIGRlbUdyaWQ6IERlbUdyaWQsXG4gIHBhcmFtczogTWVzaEdlbmVyYXRpb25QYXJhbXMsXG4pOiB7IHd4OiBGbG9hdDMyQXJyYXk7IHd5OiBGbG9hdDMyQXJyYXk7IHd6OiBGbG9hdDMyQXJyYXkgfSB7XG4gIGNvbnN0IHsgYmJveCwgY29scywgcm93cywgdmFsdWVzIH0gPSBkZW1HcmlkO1xuICBjb25zdCBsb25TdGVwID0gKGJib3gubWF4TG9uIC0gYmJveC5taW5Mb24pIC8gY29scztcbiAgY29uc3QgbGF0U3RlcCA9IChiYm94Lm1heExhdCAtIGJib3gubWluTGF0KSAvIHJvd3M7XG4gIGNvbnN0IHd4ID0gbmV3IEZsb2F0MzJBcnJheShyb3dzICogY29scyk7XG4gIGNvbnN0IHd5ID0gbmV3IEZsb2F0MzJBcnJheShyb3dzICogY29scyk7XG4gIGNvbnN0IHd6ID0gbmV3IEZsb2F0MzJBcnJheShyb3dzICogY29scyk7XG4gIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XG4gICAgY29uc3QgbGF0ID0gYmJveC5tYXhMYXQgLSAociArIDAuNSkgKiBsYXRTdGVwO1xuICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSB7XG4gICAgICBjb25zdCBsb24gPSBiYm94Lm1pbkxvbiArIChjICsgMC41KSAqIGxvblN0ZXA7XG4gICAgICBjb25zdCB7IHgsIHkgfSA9IGxvbkxhdFRvV29ybGQobG9uLCBsYXQsIHBhcmFtcyk7XG4gICAgICBjb25zdCBlbGV2ID0gdmFsdWVzW3IgKiBjb2xzICsgY107XG4gICAgICB3eFtyICogY29scyArIGNdID0geDtcbiAgICAgIHd5W3IgKiBjb2xzICsgY10gPSB5O1xuICAgICAgd3pbciAqIGNvbHMgKyBjXSA9IGlzTmFOKGVsZXYpID8gTmFOIDogZWxldiAqIHBhcmFtcy56U2NhbGUgKiBwYXJhbXMueHlTY2FsZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHsgd3gsIHd5LCB3eiB9O1xufVxuIl0sIm5hbWVzIjpbImxvbkxhdFRvV29ybGQiLCJwb2ludEluUmluZyIsImxvbiIsImxhdCIsInJpbmciLCJpbnNpZGUiLCJpIiwiaiIsImxlbmd0aCIsInhpIiwieWkiLCJ4aiIsInlqIiwicG9pbnRJblBvbHlnb24iLCJyaW5ncyIsImNsaXBEZW1Ub1BvbHlnb24iLCJkZW1HcmlkIiwicG9seWdvbnMiLCJiYm94IiwiY29scyIsInJvd3MiLCJ2YWx1ZXMiLCJsb25TdGVwIiwibWF4TG9uIiwibWluTG9uIiwibGF0U3RlcCIsIm1heExhdCIsIm1pbkxhdCIsImNsaXBwZWQiLCJGbG9hdDMyQXJyYXkiLCJmaWxsIiwiTmFOIiwiYWxsUmluZ3MiLCJmbGF0IiwiciIsInhzIiwicHVzaCIsInNvcnQiLCJhIiwiYiIsImsiLCJjU3RhcnQiLCJNYXRoIiwibWF4IiwiY2VpbCIsImNFbmQiLCJtaW4iLCJmbG9vciIsImMiLCJjb21wdXRlV29ybGRHcmlkIiwicGFyYW1zIiwid3giLCJ3eSIsInd6IiwieCIsInkiLCJlbGV2IiwiaXNOYU4iLCJ6U2NhbGUiLCJ4eVNjYWxlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/geo/clip.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/geo/projection.ts":
/*!*******************************!*\
  !*** ./lib/geo/projection.ts ***!
  \*******************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   elevToWorld: function() { return /* binding */ elevToWorld; },\n/* harmony export */   lonLatToWorld: function() { return /* binding */ lonLatToWorld; }\n/* harmony export */ });\n/* harmony import */ var _constants_kanto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants/kanto */ \"(app-pages-browser)/./lib/constants/kanto.ts\");\n\nconst COS_CENTER = Math.cos(_constants_kanto__WEBPACK_IMPORTED_MODULE_0__.PROJ_CENTER.lat * Math.PI / 180);\nfunction lonLatToWorld(lon, lat, params) {\n    const mx = (lon - _constants_kanto__WEBPACK_IMPORTED_MODULE_0__.PROJ_CENTER.lon) * COS_CENTER * _constants_kanto__WEBPACK_IMPORTED_MODULE_0__.METERS_PER_DEGREE;\n    const my = (lat - _constants_kanto__WEBPACK_IMPORTED_MODULE_0__.PROJ_CENTER.lat) * _constants_kanto__WEBPACK_IMPORTED_MODULE_0__.METERS_PER_DEGREE;\n    return {\n        x: mx * params.xyScale,\n        y: my * params.xyScale\n    };\n}\nfunction elevToWorld(elev, params) {\n    return elev * params.zScale * params.xyScale;\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2xpYi9nZW8vcHJvamVjdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBb0U7QUFHcEUsTUFBTUUsYUFBYUMsS0FBS0MsR0FBRyxDQUFDSix5REFBV0EsQ0FBQ0ssR0FBRyxHQUFHRixLQUFLRyxFQUFFLEdBQUc7QUFFakQsU0FBU0MsY0FBY0MsR0FBVyxFQUFFSCxHQUFXLEVBQUVJLE1BQTZDO0lBQ25HLE1BQU1DLEtBQUssQ0FBQ0YsTUFBTVIseURBQVdBLENBQUNRLEdBQUcsSUFBSU4sYUFBYUQsK0RBQWlCQTtJQUNuRSxNQUFNVSxLQUFLLENBQUNOLE1BQU1MLHlEQUFXQSxDQUFDSyxHQUFHLElBQUlKLCtEQUFpQkE7SUFDdEQsT0FBTztRQUFFVyxHQUFHRixLQUFLRCxPQUFPSSxPQUFPO1FBQUVDLEdBQUdILEtBQUtGLE9BQU9JLE9BQU87SUFBQztBQUMxRDtBQUVPLFNBQVNFLFlBQVlDLElBQVksRUFBRVAsTUFBd0Q7SUFDaEcsT0FBT08sT0FBT1AsT0FBT1EsTUFBTSxHQUFHUixPQUFPSSxPQUFPO0FBQzlDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL2xpYi9nZW8vcHJvamVjdGlvbi50cz9mNzUyIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBST0pfQ0VOVEVSLCBNRVRFUlNfUEVSX0RFR1JFRSB9IGZyb20gJy4uL2NvbnN0YW50cy9rYW50byc7XG5pbXBvcnQgdHlwZSB7IE1lc2hHZW5lcmF0aW9uUGFyYW1zIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5jb25zdCBDT1NfQ0VOVEVSID0gTWF0aC5jb3MoUFJPSl9DRU5URVIubGF0ICogTWF0aC5QSSAvIDE4MCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb25MYXRUb1dvcmxkKGxvbjogbnVtYmVyLCBsYXQ6IG51bWJlciwgcGFyYW1zOiBQaWNrPE1lc2hHZW5lcmF0aW9uUGFyYW1zLCAneHlTY2FsZSc+KSB7XG4gIGNvbnN0IG14ID0gKGxvbiAtIFBST0pfQ0VOVEVSLmxvbikgKiBDT1NfQ0VOVEVSICogTUVURVJTX1BFUl9ERUdSRUU7XG4gIGNvbnN0IG15ID0gKGxhdCAtIFBST0pfQ0VOVEVSLmxhdCkgKiBNRVRFUlNfUEVSX0RFR1JFRTtcbiAgcmV0dXJuIHsgeDogbXggKiBwYXJhbXMueHlTY2FsZSwgeTogbXkgKiBwYXJhbXMueHlTY2FsZSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZWxldlRvV29ybGQoZWxldjogbnVtYmVyLCBwYXJhbXM6IFBpY2s8TWVzaEdlbmVyYXRpb25QYXJhbXMsICd4eVNjYWxlJyB8ICd6U2NhbGUnPikge1xuICByZXR1cm4gZWxldiAqIHBhcmFtcy56U2NhbGUgKiBwYXJhbXMueHlTY2FsZTtcbn1cbiJdLCJuYW1lcyI6WyJQUk9KX0NFTlRFUiIsIk1FVEVSU19QRVJfREVHUkVFIiwiQ09TX0NFTlRFUiIsIk1hdGgiLCJjb3MiLCJsYXQiLCJQSSIsImxvbkxhdFRvV29ybGQiLCJsb24iLCJwYXJhbXMiLCJteCIsIm15IiwieCIsInh5U2NhbGUiLCJ5IiwiZWxldlRvV29ybGQiLCJlbGV2IiwielNjYWxlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/geo/projection.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/mesh/solid.ts":
/*!***************************!*\
  !*** ./lib/mesh/solid.ts ***!
  \***************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   buildSolidMesh: function() { return /* binding */ buildSolidMesh; }\n/* harmony export */ });\n/* harmony import */ var _geo_clip__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../geo/clip */ \"(app-pages-browser)/./lib/geo/clip.ts\");\n/* harmony import */ var earcut__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! earcut */ \"(app-pages-browser)/./node_modules/earcut/src/earcut.js\");\n/* harmony import */ var earcut__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(earcut__WEBPACK_IMPORTED_MODULE_1__);\n\n\nfunction buildSolidMesh(demGrid, params, baseZ) {\n    const { cols, rows, values } = demGrid;\n    const { wx, wy, wz } = (0,_geo_clip__WEBPACK_IMPORTED_MODULE_0__.computeWorldGrid)(demGrid, params);\n    const dec = params.decimation;\n    const seaZ = 0.0 * params.zScale * params.xyScale;\n    function getXYZ(r, c) {\n        const idx = r * cols + c;\n        const z = isNaN(wz[idx]) ? seaZ : wz[idx];\n        return [\n            wx[idx],\n            wy[idx],\n            z\n        ];\n    }\n    function isValid(r, c) {\n        return r >= 0 && r < rows && c >= 0 && c < cols && !isNaN(values[r * cols + c]);\n    }\n    // Collect boundary edges (valid cell adjacent to invalid)\n    const wallPosArr = [];\n    const wallNormArr = [];\n    function pushWallQuad(ax, ay, az, bx, by, bz) {\n        // Wall from top edge (A_top, B_top) down to baseZ\n        const nx = -(by - ay), ny = bx - ax, nz = 0;\n        const len = Math.sqrt(nx * nx + ny * ny);\n        const nnx = len > 0 ? nx / len : 0, nny = len > 0 ? ny / len : 0;\n        // Tri 1: A_top, B_top, A_bot\n        wallPosArr.push(ax, ay, az, bx, by, bz, ax, ay, baseZ);\n        wallNormArr.push(nnx, nny, 0, nnx, nny, 0, nnx, nny, 0);\n        // Tri 2: B_top, B_bot, A_bot\n        wallPosArr.push(bx, by, bz, bx, by, baseZ, ax, ay, baseZ);\n        wallNormArr.push(nnx, nny, 0, nnx, nny, 0, nnx, nny, 0);\n    }\n    for(let r = 0; r < rows; r += dec){\n        for(let c = 0; c < cols; c += dec){\n            if (!isValid(r, c)) continue;\n            const r2 = Math.min(r + dec, rows - 1);\n            const c2 = Math.min(c + dec, cols - 1);\n            const A = getXYZ(r, c);\n            const B = getXYZ(r2, c);\n            const C = getXYZ(r, c2);\n            const D = getXYZ(r2, c2);\n            // Check 4 neighbors\n            if (!isValid(r - dec, c)) pushWallQuad(C[0], C[1], C[2], A[0], A[1], A[2]);\n            if (!isValid(r + dec, c)) pushWallQuad(B[0], B[1], B[2], D[0], D[1], D[2]);\n            if (!isValid(r, c - dec)) pushWallQuad(A[0], A[1], A[2], B[0], B[1], B[2]);\n            if (!isValid(r, c + dec)) pushWallQuad(D[0], D[1], D[2], C[0], C[1], C[2]);\n        }\n    }\n    // Bottom face: collect all valid boundary vertices in XY and earcut\n    const botVerts = [];\n    const seen = new Set();\n    for(let r = 0; r < rows; r += dec){\n        for(let c = 0; c < cols; c += dec){\n            if (!isValid(r, c)) continue;\n            const key = r * cols + c;\n            if (!seen.has(key)) {\n                seen.add(key);\n                const idx = r * cols + c;\n                botVerts.push(wx[idx], wy[idx]);\n            }\n        }\n    }\n    const indices = earcut__WEBPACK_IMPORTED_MODULE_1___default()(botVerts, undefined, 2);\n    const botPosArr = [];\n    const botNormArr = [];\n    for(let i = 0; i < indices.length; i += 3){\n        // Reverse winding for downward normal\n        const i0 = indices[i] * 2, i1 = indices[i + 2] * 2, i2 = indices[i + 1] * 2;\n        botPosArr.push(botVerts[i0], botVerts[i0 + 1], baseZ);\n        botPosArr.push(botVerts[i1], botVerts[i1 + 1], baseZ);\n        botPosArr.push(botVerts[i2], botVerts[i2 + 1], baseZ);\n        botNormArr.push(0, 0, -1, 0, 0, -1, 0, 0, -1);\n    }\n    return {\n        walls: {\n            positions: new Float32Array(wallPosArr),\n            normals: new Float32Array(wallNormArr),\n            triangleCount: wallPosArr.length / 9\n        },\n        bottom: {\n            positions: new Float32Array(botPosArr),\n            normals: new Float32Array(botNormArr),\n            triangleCount: botPosArr.length / 9\n        }\n    };\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QWFVLGVBQWVYLFVBQVVHLE1BQU0sR0FBRztRQUFFO0lBQy9IO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbGliL21lc2gvc29saWQudHM/MWRkMiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IERlbUdyaWQsIE1lc2hHZW5lcmF0aW9uUGFyYW1zLCBUcmlhbmdsZVNvdXAgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBjb21wdXRlV29ybGRHcmlkIH0gZnJvbSAnLi4vZ2VvL2NsaXAnO1xuaW1wb3J0IGVhcmN1dCBmcm9tICdlYXJjdXQnO1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTb2xpZE1lc2goXG4gIGRlbUdyaWQ6IERlbUdyaWQsXG4gIHBhcmFtczogTWVzaEdlbmVyYXRpb25QYXJhbXMsXG4gIGJhc2VaOiBudW1iZXIsXG4pOiB7IHdhbGxzOiBUcmlhbmdsZVNvdXA7IGJvdHRvbTogVHJpYW5nbGVTb3VwIH0ge1xuICBjb25zdCB7IGNvbHMsIHJvd3MsIHZhbHVlcyB9ID0gZGVtR3JpZDtcbiAgY29uc3QgeyB3eCwgd3ksIHd6IH0gPSBjb21wdXRlV29ybGRHcmlkKGRlbUdyaWQsIHBhcmFtcyk7XG4gIGNvbnN0IGRlYyA9IHBhcmFtcy5kZWNpbWF0aW9uO1xuXG4gIGNvbnN0IHNlYVogPSAwLjAgKiBwYXJhbXMuelNjYWxlICogcGFyYW1zLnh5U2NhbGU7XG4gIGZ1bmN0aW9uIGdldFhZWihyOiBudW1iZXIsIGM6IG51bWJlcik6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XG4gICAgY29uc3QgaWR4ID0gciAqIGNvbHMgKyBjO1xuICAgIGNvbnN0IHogPSBpc05hTih3eltpZHhdKSA/IHNlYVogOiB3eltpZHhdO1xuICAgIHJldHVybiBbd3hbaWR4XSwgd3lbaWR4XSwgel07XG4gIH1cbiAgZnVuY3Rpb24gaXNWYWxpZChyOiBudW1iZXIsIGM6IG51bWJlcikge1xuICAgIHJldHVybiByID49IDAgJiYgciA8IHJvd3MgJiYgYyA+PSAwICYmIGMgPCBjb2xzICYmICFpc05hTih2YWx1ZXNbciAqIGNvbHMgKyBjXSk7XG4gIH1cblxuICAvLyBDb2xsZWN0IGJvdW5kYXJ5IGVkZ2VzICh2YWxpZCBjZWxsIGFkamFjZW50IHRvIGludmFsaWQpXG4gIGNvbnN0IHdhbGxQb3NBcnI6IG51bWJlcltdID0gW107XG4gIGNvbnN0IHdhbGxOb3JtQXJyOiBudW1iZXJbXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHB1c2hXYWxsUXVhZChheDogbnVtYmVyLCBheTogbnVtYmVyLCBhejogbnVtYmVyLCBieDogbnVtYmVyLCBieTogbnVtYmVyLCBiejogbnVtYmVyKSB7XG4gICAgLy8gV2FsbCBmcm9tIHRvcCBlZGdlIChBX3RvcCwgQl90b3ApIGRvd24gdG8gYmFzZVpcbiAgICBjb25zdCBueCA9IC0oYnkgLSBheSksIG55ID0gYnggLSBheCwgbnogPSAwO1xuICAgIGNvbnN0IGxlbiA9IE1hdGguc3FydChueCAqIG54ICsgbnkgKiBueSk7XG4gICAgY29uc3Qgbm54ID0gbGVuID4gMCA/IG54IC8gbGVuIDogMCwgbm55ID0gbGVuID4gMCA/IG55IC8gbGVuIDogMDtcbiAgICAvLyBUcmkgMTogQV90b3AsIEJfdG9wLCBBX2JvdFxuICAgIHdhbGxQb3NBcnIucHVzaChheCwgYXksIGF6LCBieCwgYnksIGJ6LCBheCwgYXksIGJhc2VaKTtcbiAgICB3YWxsTm9ybUFyci5wdXNoKG5ueCwgbm55LCAwLCBubngsIG5ueSwgMCwgbm54LCBubnksIDApO1xuICAgIC8vIFRyaSAyOiBCX3RvcCwgQl9ib3QsIEFfYm90XG4gICAgd2FsbFBvc0Fyci5wdXNoKGJ4LCBieSwgYnosIGJ4LCBieSwgYmFzZVosIGF4LCBheSwgYmFzZVopO1xuICAgIHdhbGxOb3JtQXJyLnB1c2gobm54LCBubnksIDAsIG5ueCwgbm55LCAwLCBubngsIG5ueSwgMCk7XG4gIH1cblxuICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIgKz0gZGVjKSB7XG4gICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjICs9IGRlYykge1xuICAgICAgaWYgKCFpc1ZhbGlkKHIsIGMpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHIyID0gTWF0aC5taW4ociArIGRlYywgcm93cyAtIDEpO1xuICAgICAgY29uc3QgYzIgPSBNYXRoLm1pbihjICsgZGVjLCBjb2xzIC0gMSk7XG4gICAgICBjb25zdCBBID0gZ2V0WFlaKHIsIGMpO1xuICAgICAgY29uc3QgQiA9IGdldFhZWihyMiwgYyk7XG4gICAgICBjb25zdCBDID0gZ2V0WFlaKHIsIGMyKTtcbiAgICAgIGNvbnN0IEQgPSBnZXRYWVoocjIsIGMyKTtcblxuICAgICAgLy8gQ2hlY2sgNCBuZWlnaGJvcnNcbiAgICAgIGlmICghaXNWYWxpZChyIC0gZGVjLCBjKSkgcHVzaFdhbGxRdWFkKENbMF0sIENbMV0sIENbMl0sIEFbMF0sIEFbMV0sIEFbMl0pO1xuICAgICAgaWYgKCFpc1ZhbGlkKHIgKyBkZWMsIGMpKSBwdXNoV2FsbFF1YWQoQlswXSwgQlsxXSwgQlsyXSwgRFswXSwgRFsxXSwgRFsyXSk7XG4gICAgICBpZiAoIWlzVmFsaWQociwgYyAtIGRlYykpIHB1c2hXYWxsUXVhZChBWzBdLCBBWzFdLCBBWzJdLCBCWzBdLCBCWzFdLCBCWzJdKTtcbiAgICAgIGlmICghaXNWYWxpZChyLCBjICsgZGVjKSkgcHVzaFdhbGxRdWFkKERbMF0sIERbMV0sIERbMl0sIENbMF0sIENbMV0sIENbMl0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJvdHRvbSBmYWNlOiBjb2xsZWN0IGFsbCB2YWxpZCBib3VuZGFyeSB2ZXJ0aWNlcyBpbiBYWSBhbmQgZWFyY3V0XG4gIGNvbnN0IGJvdFZlcnRzOiBudW1iZXJbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgciArPSBkZWMpIHtcbiAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMgKz0gZGVjKSB7XG4gICAgICBpZiAoIWlzVmFsaWQociwgYykpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qga2V5ID0gciAqIGNvbHMgKyBjO1xuICAgICAgaWYgKCFzZWVuLmhhcyhrZXkpKSB7XG4gICAgICAgIHNlZW4uYWRkKGtleSk7XG4gICAgICAgIGNvbnN0IGlkeCA9IHIgKiBjb2xzICsgYztcbiAgICAgICAgYm90VmVydHMucHVzaCh3eFtpZHhdLCB3eVtpZHhdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBpbmRpY2VzID0gZWFyY3V0KGJvdFZlcnRzLCB1bmRlZmluZWQsIDIpO1xuICBjb25zdCBib3RQb3NBcnI6IG51bWJlcltdID0gW107XG4gIGNvbnN0IGJvdE5vcm1BcnI6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkgKz0gMykge1xuICAgIC8vIFJldmVyc2Ugd2luZGluZyBmb3IgZG93bndhcmQgbm9ybWFsXG4gICAgY29uc3QgaTAgPSBpbmRpY2VzW2ldICogMiwgaTEgPSBpbmRpY2VzW2kgKyAyXSAqIDIsIGkyID0gaW5kaWNlc1tpICsgMV0gKiAyO1xuICAgIGJvdFBvc0Fyci5wdXNoKGJvdFZlcnRzW2kwXSwgYm90VmVydHNbaTAgKyAxXSwgYmFzZVopO1xuICAgIGJvdFBvc0Fyci5wdXNoKGJvdFZlcnRzW2kxXSwgYm90VmVydHNbaTEgKyAxXSwgYmFzZVopO1xuICAgIGJvdFBvc0Fyci5wdXNoKGJvdFZlcnRzW2kyXSwgYm90VmVydHNbaTIgKyAxXSwgYmFzZVopO1xuICAgIGJvdE5vcm1BcnIucHVzaCgwLCAwLCAtMSwgMCwgMCwgLTEsIDAsIDAsIC0xKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgd2FsbHM6IHsgcG9zaXRpb25zOiBuZXcgRmxvYXQzMkFycmF5KHdhbGxQb3NBcnIpLCBub3JtYWxzOiBuZXcgRmxvYXQzMkFycmF5KHdhbGxOb3JtQXJyKSwgdHJpYW5nbGVDb3VudDogd2FsbFBvc0Fyci5sZW5ndGggLyA5IH0sXG4gICAgYm90dG9tOiB7IHBvc2l0aW9uczogbmV3IEZsb2F0MzJBcnJheShib3RQb3NBcnIpLCBub3JtYWxzOiBuZXcgRmxvYXQzMkFycmF5KGJvdE5vcm1BcnIpLCB0cmlhbmdsZUNvdW50OiBib3RQb3NBcnIubGVuZ3RoIC8gOSB9LFxuICB9O1xufVxuIl0sIm5hbWVzIjpbImNvbXB1dGVXb3JsZEdyaWQiLCJlYXJjdXQiLCJidWlsZFNvbGlkTWVzaCIsImRlbUdyaWQiLCJwYXJhbXMiLCJiYXNlWiIsImNvbHMiLCJyb3dzIiwidmFsdWVzIiwid3giLCJ3eSIsInd6IiwiZGVjIiwiZGVjaW1hdGlvbiIsInNlYVoiLCJ6U2NhbGUiLCJ4eVNjYWxlIiwiZ2V0WFlaIiwiciIsImMiLCJpZHgiLCJ6IiwiaXNOYU4iLCJpc1ZhbGlkIiwid2FsbFBvc0FyciIsIndhbGxOb3JtQXJyIiwicHVzaFdhbGxRdWFkIiwiYXgiLCJheSIsImF6IiwiYngiLCJieSIsImJ6IiwibngiLCJueSIsIm56IiwibGVuIiwiTWF0aCIsInNxcnQiLCJubngiLCJubnkiLCJwdXNoIiwicjIiLCJtaW4iLCJjMiIsIkEiLCJCIiwiQyIsIkQiLCJib3RWZXJ0cyIsInNlZW4iLCJTZXQiLCJrZXkiLCJoYXMiLCJhZGQiLCJpbmRpY2VzIiwidW5kZWZpbmVkIiwiYm90UG9zQXJyIiwiYm90Tm9ybUFyciIsImkiLCJsZW5ndGgiLCJpMCIsImkxIiwiaTIiLCJ3YWxscyIsInBvc2l0aW9ucyIsIkZsb2F0MzJBcnJheSIsIm5vcm1hbHMiLCJ0cmlhbmdsZUNvdW50IiwiYm90dG9tIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/mesh/solid.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/mesh/stl.ts":
/*!*************************!*\
  !*** ./lib/mesh/stl.ts ***!
  \*************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   serializeStl: function() { return /* binding */ serializeStl; }\n/* harmony export */ });\nconst STL_SCALE = 1000; // world units (m) → mm\nfunction writeTriangle(view, offset, nx, ny, nz, verts) {\n    view.setFloat32(offset, nx, true);\n    offset += 4;\n    view.setFloat32(offset, ny, true);\n    offset += 4;\n    view.setFloat32(offset, nz, true);\n    offset += 4;\n    for(let i = 0; i < 9; i++){\n        view.setFloat32(offset, verts[i] * STL_SCALE, true);\n        offset += 4;\n    }\n    view.setUint16(offset, 0, true);\n    offset += 2;\n    return offset;\n}\nfunction serializeStl(soups) {\n    const totalTris = soups.reduce((s, t)=>s + t.triangleCount, 0);\n    const buf = new ArrayBuffer(80 + 4 + 50 * totalTris);\n    const view = new DataView(buf);\n    const header = new Uint8Array(buf, 0, 80);\n    const enc = new TextEncoder();\n    header.set(enc.encode(\"pref-puzzle STL\"));\n    view.setUint32(80, totalTris, true);\n    let offset = 84;\n    for (const soup of soups){\n        const { positions, normals, triangleCount } = soup;\n        for(let t = 0; t < triangleCount; t++){\n            const b = t * 9;\n            const n = t * 9;\n            offset = writeTriangle(view, offset, normals[n], normals[n + 1], normals[n + 2], Array.from(positions.slice(b, b + 9)));\n        }\n    }\n    return buf;\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2xpYi9tZXNoL3N0bC50cyIsIm1hcHBpbmdzIjoiOzs7O0FBRUEsTUFBTUEsWUFBWSxNQUFNLHVCQUF1QjtBQUUvQyxTQUFTQyxjQUFjQyxJQUFjLEVBQUVDLE1BQWMsRUFBRUMsRUFBVSxFQUFFQyxFQUFVLEVBQUVDLEVBQVUsRUFBRUMsS0FBZTtJQUN4R0wsS0FBS00sVUFBVSxDQUFDTCxRQUFRQyxJQUFJO0lBQU9ELFVBQVU7SUFDN0NELEtBQUtNLFVBQVUsQ0FBQ0wsUUFBUUUsSUFBSTtJQUFPRixVQUFVO0lBQzdDRCxLQUFLTSxVQUFVLENBQUNMLFFBQVFHLElBQUk7SUFBT0gsVUFBVTtJQUM3QyxJQUFLLElBQUlNLElBQUksR0FBR0EsSUFBSSxHQUFHQSxJQUFLO1FBQzFCUCxLQUFLTSxVQUFVLENBQUNMLFFBQVFJLEtBQUssQ0FBQ0UsRUFBRSxHQUFHVCxXQUFXO1FBQU9HLFVBQVU7SUFDakU7SUFDQUQsS0FBS1EsU0FBUyxDQUFDUCxRQUFRLEdBQUc7SUFBT0EsVUFBVTtJQUMzQyxPQUFPQTtBQUNUO0FBRU8sU0FBU1EsYUFBYUMsS0FBcUI7SUFDaEQsTUFBTUMsWUFBWUQsTUFBTUUsTUFBTSxDQUFDLENBQUNDLEdBQUdDLElBQU1ELElBQUlDLEVBQUVDLGFBQWEsRUFBRTtJQUM5RCxNQUFNQyxNQUFNLElBQUlDLFlBQVksS0FBSyxJQUFJLEtBQUtOO0lBQzFDLE1BQU1YLE9BQU8sSUFBSWtCLFNBQVNGO0lBQzFCLE1BQU1HLFNBQVMsSUFBSUMsV0FBV0osS0FBSyxHQUFHO0lBQ3RDLE1BQU1LLE1BQU0sSUFBSUM7SUFDaEJILE9BQU9JLEdBQUcsQ0FBQ0YsSUFBSUcsTUFBTSxDQUFDO0lBQ3RCeEIsS0FBS3lCLFNBQVMsQ0FBQyxJQUFJZCxXQUFXO0lBQzlCLElBQUlWLFNBQVM7SUFDYixLQUFLLE1BQU15QixRQUFRaEIsTUFBTztRQUN4QixNQUFNLEVBQUVpQixTQUFTLEVBQUVDLE9BQU8sRUFBRWIsYUFBYSxFQUFFLEdBQUdXO1FBQzlDLElBQUssSUFBSVosSUFBSSxHQUFHQSxJQUFJQyxlQUFlRCxJQUFLO1lBQ3RDLE1BQU1lLElBQUlmLElBQUk7WUFDZCxNQUFNZ0IsSUFBSWhCLElBQUk7WUFDZGIsU0FBU0YsY0FBY0MsTUFBTUMsUUFDM0IyQixPQUFPLENBQUNFLEVBQUUsRUFBRUYsT0FBTyxDQUFDRSxJQUFJLEVBQUUsRUFBRUYsT0FBTyxDQUFDRSxJQUFJLEVBQUUsRUFDMUNDLE1BQU1DLElBQUksQ0FBQ0wsVUFBVU0sS0FBSyxDQUFDSixHQUFHQSxJQUFJO1FBRXRDO0lBQ0Y7SUFDQSxPQUFPYjtBQUNUIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL2xpYi9tZXNoL3N0bC50cz9jNzQ2Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgVHJpYW5nbGVTb3VwIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5jb25zdCBTVExfU0NBTEUgPSAxMDAwOyAvLyB3b3JsZCB1bml0cyAobSkg4oaSIG1tXG5cbmZ1bmN0aW9uIHdyaXRlVHJpYW5nbGUodmlldzogRGF0YVZpZXcsIG9mZnNldDogbnVtYmVyLCBueDogbnVtYmVyLCBueTogbnVtYmVyLCBuejogbnVtYmVyLCB2ZXJ0czogbnVtYmVyW10pOiBudW1iZXIge1xuICB2aWV3LnNldEZsb2F0MzIob2Zmc2V0LCBueCwgdHJ1ZSk7IG9mZnNldCArPSA0O1xuICB2aWV3LnNldEZsb2F0MzIob2Zmc2V0LCBueSwgdHJ1ZSk7IG9mZnNldCArPSA0O1xuICB2aWV3LnNldEZsb2F0MzIob2Zmc2V0LCBueiwgdHJ1ZSk7IG9mZnNldCArPSA0O1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDk7IGkrKykge1xuICAgIHZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIHZlcnRzW2ldICogU1RMX1NDQUxFLCB0cnVlKTsgb2Zmc2V0ICs9IDQ7XG4gIH1cbiAgdmlldy5zZXRVaW50MTYob2Zmc2V0LCAwLCB0cnVlKTsgb2Zmc2V0ICs9IDI7XG4gIHJldHVybiBvZmZzZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVTdGwoc291cHM6IFRyaWFuZ2xlU291cFtdKTogQXJyYXlCdWZmZXIge1xuICBjb25zdCB0b3RhbFRyaXMgPSBzb3Vwcy5yZWR1Y2UoKHMsIHQpID0+IHMgKyB0LnRyaWFuZ2xlQ291bnQsIDApO1xuICBjb25zdCBidWYgPSBuZXcgQXJyYXlCdWZmZXIoODAgKyA0ICsgNTAgKiB0b3RhbFRyaXMpO1xuICBjb25zdCB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1Zik7XG4gIGNvbnN0IGhlYWRlciA9IG5ldyBVaW50OEFycmF5KGJ1ZiwgMCwgODApO1xuICBjb25zdCBlbmMgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgaGVhZGVyLnNldChlbmMuZW5jb2RlKCdwcmVmLXB1enpsZSBTVEwnKSk7XG4gIHZpZXcuc2V0VWludDMyKDgwLCB0b3RhbFRyaXMsIHRydWUpO1xuICBsZXQgb2Zmc2V0ID0gODQ7XG4gIGZvciAoY29uc3Qgc291cCBvZiBzb3Vwcykge1xuICAgIGNvbnN0IHsgcG9zaXRpb25zLCBub3JtYWxzLCB0cmlhbmdsZUNvdW50IH0gPSBzb3VwO1xuICAgIGZvciAobGV0IHQgPSAwOyB0IDwgdHJpYW5nbGVDb3VudDsgdCsrKSB7XG4gICAgICBjb25zdCBiID0gdCAqIDk7XG4gICAgICBjb25zdCBuID0gdCAqIDk7XG4gICAgICBvZmZzZXQgPSB3cml0ZVRyaWFuZ2xlKHZpZXcsIG9mZnNldCxcbiAgICAgICAgbm9ybWFsc1tuXSwgbm9ybWFsc1tuICsgMV0sIG5vcm1hbHNbbiArIDJdLFxuICAgICAgICBBcnJheS5mcm9tKHBvc2l0aW9ucy5zbGljZShiLCBiICsgOSkpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYnVmO1xufVxuIl0sIm5hbWVzIjpbIlNUTF9TQ0FMRSIsIndyaXRlVHJpYW5nbGUiLCJ2aWV3Iiwib2Zmc2V0IiwibngiLCJueSIsIm56IiwidmVydHMiLCJzZXRGbG9hdDMyIiwiaSIsInNldFVpbnQxNiIsInNlcmlhbGl6ZVN0bCIsInNvdXBzIiwidG90YWxUcmlzIiwicmVkdWNlIiwicyIsInQiLCJ0cmlhbmdsZUNvdW50IiwiYnVmIiwiQXJyYXlCdWZmZXIiLCJEYXRhVmlldyIsImhlYWRlciIsIlVpbnQ4QXJyYXkiLCJlbmMiLCJUZXh0RW5jb2RlciIsInNldCIsImVuY29kZSIsInNldFVpbnQzMiIsInNvdXAiLCJwb3NpdGlvbnMiLCJub3JtYWxzIiwiYiIsIm4iLCJBcnJheSIsImZyb20iLCJzbGljZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/mesh/stl.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/mesh/terrain.ts":
/*!*****************************!*\
  !*** ./lib/mesh/terrain.ts ***!
  \*****************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   buildTerrainMesh: function() { return /* binding */ buildTerrainMesh; }\n/* harmony export */ });\n/* harmony import */ var _geo_clip__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../geo/clip */ \"(app-pages-browser)/./lib/geo/clip.ts\");\n\nfunction cross(ax, ay, az, bx, by, bz) {\n    return [\n        ay * bz - az * by,\n        az * bx - ax * bz,\n        ax * by - ay * bx\n    ];\n}\nfunction normalize3(v) {\n    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);\n    return len > 0 ? [\n        v[0] / len,\n        v[1] / len,\n        v[2] / len\n    ] : [\n        0,\n        0,\n        1\n    ];\n}\nfunction buildTerrainMesh(demGrid, params) {\n    const { cols, rows, values } = demGrid;\n    const dec = params.decimation;\n    const { wx, wy, wz } = (0,_geo_clip__WEBPACK_IMPORTED_MODULE_0__.computeWorldGrid)(demGrid, params);\n    let minValidZ = Infinity;\n    for(let i = 0; i < wz.length; i++){\n        if (!isNaN(wz[i]) && wz[i] < minValidZ) minValidZ = wz[i];\n    }\n    if (!isFinite(minValidZ)) minValidZ = 0;\n    const baseZ = minValidZ - params.baseThickness * params.xyScale;\n    const seaZ = 0.0 * params.zScale * params.xyScale;\n    // First pass: count valid triangles to pre-allocate typed arrays\n    let triCount = 0;\n    for(let r = 0; r < rows - dec; r += dec){\n        for(let c = 0; c < cols - dec; c += dec){\n            const r2 = Math.min(r + dec, rows - 1);\n            const c2 = Math.min(c + dec, cols - 1);\n            if (!(isNaN(values[r * cols + c]) && isNaN(values[r2 * cols + c]) && isNaN(values[r * cols + c2]) && isNaN(values[r2 * cols + c2]))) {\n                triCount += 2;\n            }\n        }\n    }\n    const posArr = new Float32Array(triCount * 9);\n    const normArr = new Float32Array(triCount * 9);\n    let ptr = 0;\n    const getZ = (r, c)=>{\n        const z = wz[r * cols + c];\n        return isNaN(z) ? seaZ : z;\n    };\n    for(let r = 0; r < rows - dec; r += dec){\n        for(let c = 0; c < cols - dec; c += dec){\n            const r2 = Math.min(r + dec, rows - 1);\n            const c2 = Math.min(c + dec, cols - 1);\n            const i00 = r * cols + c, i10 = r2 * cols + c, i01 = r * cols + c2, i11 = r2 * cols + c2;\n            if (isNaN(values[i00]) && isNaN(values[i10]) && isNaN(values[i01]) && isNaN(values[i11])) continue;\n            const ax = wx[i00], ay = wy[i00], az = getZ(r, c);\n            const bx = wx[i10], by = wy[i10], bz = getZ(r2, c);\n            const cx = wx[i01], cy = wy[i01], cz = getZ(r, c2);\n            const dx = wx[i11], dy = wy[i11], dz = getZ(r2, c2);\n            // Triangle A-C-B\n            {\n                const e1x = cx - ax, e1y = cy - ay, e1z = cz - az;\n                const e2x = bx - ax, e2y = by - ay, e2z = bz - az;\n                const [nx, ny, nz] = normalize3(cross(e1x, e1y, e1z, e2x, e2y, e2z));\n                posArr[ptr] = ax;\n                posArr[ptr + 1] = ay;\n                posArr[ptr + 2] = az;\n                posArr[ptr + 3] = cx;\n                posArr[ptr + 4] = cy;\n                posArr[ptr + 5] = cz;\n                posArr[ptr + 6] = bx;\n                posArr[ptr + 7] = by;\n                posArr[ptr + 8] = bz;\n                normArr[ptr] = nx;\n                normArr[ptr + 1] = ny;\n                normArr[ptr + 2] = nz;\n                normArr[ptr + 3] = nx;\n                normArr[ptr + 4] = ny;\n                normArr[ptr + 5] = nz;\n                normArr[ptr + 6] = nx;\n                normArr[ptr + 7] = ny;\n                normArr[ptr + 8] = nz;\n                ptr += 9;\n            }\n            // Triangle B-C-D\n            {\n                const e1x = cx - bx, e1y = cy - by, e1z = cz - bz;\n                const e2x = dx - bx, e2y = dy - by, e2z = dz - bz;\n                const [nx, ny, nz] = normalize3(cross(e1x, e1y, e1z, e2x, e2y, e2z));\n                posArr[ptr] = bx;\n                posArr[ptr + 1] = by;\n                posArr[ptr + 2] = bz;\n                posArr[ptr + 3] = cx;\n                posArr[ptr + 4] = cy;\n                posArr[ptr + 5] = cz;\n                posArr[ptr + 6] = dx;\n                posArr[ptr + 7] = dy;\n                posArr[ptr + 8] = dz;\n                normArr[ptr] = nx;\n                normArr[ptr + 1] = ny;\n                normArr[ptr + 2] = nz;\n                normArr[ptr + 3] = nx;\n                normArr[ptr + 4] = ny;\n                normArr[ptr + 5] = nz;\n                normArr[ptr + 6] = nx;\n                normArr[ptr + 7] = ny;\n                normArr[ptr + 8] = nz;\n                ptr += 9;\n            }\n        }\n    }\n    return {\n        mesh: {\n            positions: posArr,\n            normals: normArr,\n            triangleCount: triCount\n        },\n        baseZ\n    };\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2xpYi9tZXNoL3RlcnJhaW4udHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDK0M7QUFFL0MsU0FBU0MsTUFBTUMsRUFBVSxFQUFFQyxFQUFVLEVBQUVDLEVBQVUsRUFBRUMsRUFBVSxFQUFFQyxFQUFVLEVBQUVDLEVBQVU7SUFDbkYsT0FBTztRQUFDSixLQUFLSSxLQUFLSCxLQUFLRTtRQUFJRixLQUFLQyxLQUFLSCxLQUFLSztRQUFJTCxLQUFLSSxLQUFLSCxLQUFLRTtLQUFHO0FBQ2xFO0FBQ0EsU0FBU0csV0FBV0MsQ0FBMkI7SUFDN0MsTUFBTUMsTUFBTUMsS0FBS0MsSUFBSSxDQUFDSCxDQUFDLENBQUMsRUFBRSxHQUFHQSxDQUFDLENBQUMsRUFBRSxHQUFHQSxDQUFDLENBQUMsRUFBRSxHQUFHQSxDQUFDLENBQUMsRUFBRSxHQUFHQSxDQUFDLENBQUMsRUFBRSxHQUFHQSxDQUFDLENBQUMsRUFBRTtJQUM3RCxPQUFPQyxNQUFNLElBQUk7UUFBQ0QsQ0FBQyxDQUFDLEVBQUUsR0FBR0M7UUFBS0QsQ0FBQyxDQUFDLEVBQUUsR0FBR0M7UUFBS0QsQ0FBQyxDQUFDLEVBQUUsR0FBR0M7S0FBSSxHQUFHO1FBQUM7UUFBRztRQUFHO0tBQUU7QUFDbkU7QUFFTyxTQUFTRyxpQkFBaUJDLE9BQWdCLEVBQUVDLE1BQTRCO0lBQzdFLE1BQU0sRUFBRUMsSUFBSSxFQUFFQyxJQUFJLEVBQUVDLE1BQU0sRUFBRSxHQUFHSjtJQUMvQixNQUFNSyxNQUFNSixPQUFPSyxVQUFVO0lBQzdCLE1BQU0sRUFBRUMsRUFBRSxFQUFFQyxFQUFFLEVBQUVDLEVBQUUsRUFBRSxHQUFHdkIsMkRBQWdCQSxDQUFDYyxTQUFTQztJQUVqRCxJQUFJUyxZQUFZQztJQUNoQixJQUFLLElBQUlDLElBQUksR0FBR0EsSUFBSUgsR0FBR0ksTUFBTSxFQUFFRCxJQUFLO1FBQ2xDLElBQUksQ0FBQ0UsTUFBTUwsRUFBRSxDQUFDRyxFQUFFLEtBQUtILEVBQUUsQ0FB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cyI6WyJ3ZWJwYWNrOi8vX05fRS8uL2xpYi9tZXNoL3RlcnJhaW4udHM/Y2Q1NCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IERlbUdyaWQsIE1lc2hHZW5lcmF0aW9uUGFyYW1zLCBUcmlhbmdsZVNvdXAgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBjb21wdXRlV29ybGRHcmlkIH0gZnJvbSAnLi4vZ2VvL2NsaXAnO1xuXG5mdW5jdGlvbiBjcm9zcyhheDogbnVtYmVyLCBheTogbnVtYmVyLCBhejogbnVtYmVyLCBieDogbnVtYmVyLCBieTogbnVtYmVyLCBiejogbnVtYmVyKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgcmV0dXJuIFtheSAqIGJ6IC0gYXogKiBieSwgYXogKiBieCAtIGF4ICogYnosIGF4ICogYnkgLSBheSAqIGJ4XTtcbn1cbmZ1bmN0aW9uIG5vcm1hbGl6ZTModjogW251bWJlciwgbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgbGVuID0gTWF0aC5zcXJ0KHZbMF0gKiB2WzBdICsgdlsxXSAqIHZbMV0gKyB2WzJdICogdlsyXSk7XG4gIHJldHVybiBsZW4gPiAwID8gW3ZbMF0gLyBsZW4sIHZbMV0gLyBsZW4sIHZbMl0gLyBsZW5dIDogWzAsIDAsIDFdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUZXJyYWluTWVzaChkZW1HcmlkOiBEZW1HcmlkLCBwYXJhbXM6IE1lc2hHZW5lcmF0aW9uUGFyYW1zKTogeyBtZXNoOiBUcmlhbmdsZVNvdXA7IGJhc2VaOiBudW1iZXIgfSB7XG4gIGNvbnN0IHsgY29scywgcm93cywgdmFsdWVzIH0gPSBkZW1HcmlkO1xuICBjb25zdCBkZWMgPSBwYXJhbXMuZGVjaW1hdGlvbjtcbiAgY29uc3QgeyB3eCwgd3ksIHd6IH0gPSBjb21wdXRlV29ybGRHcmlkKGRlbUdyaWQsIHBhcmFtcyk7XG5cbiAgbGV0IG1pblZhbGlkWiA9IEluZmluaXR5O1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHd6Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFpc05hTih3eltpXSkgJiYgd3pbaV0gPCBtaW5WYWxpZFopIG1pblZhbGlkWiA9IHd6W2ldO1xuICB9XG4gIGlmICghaXNGaW5pdGUobWluVmFsaWRaKSkgbWluVmFsaWRaID0gMDtcbiAgY29uc3QgYmFzZVogPSBtaW5WYWxpZFogLSBwYXJhbXMuYmFzZVRoaWNrbmVzcyAqIHBhcmFtcy54eVNjYWxlO1xuXG4gIGNvbnN0IHNlYVogPSAwLjAgKiBwYXJhbXMuelNjYWxlICogcGFyYW1zLnh5U2NhbGU7XG5cbiAgLy8gRmlyc3QgcGFzczogY291bnQgdmFsaWQgdHJpYW5nbGVzIHRvIHByZS1hbGxvY2F0ZSB0eXBlZCBhcnJheXNcbiAgbGV0IHRyaUNvdW50ID0gMDtcbiAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzIC0gZGVjOyByICs9IGRlYykge1xuICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29scyAtIGRlYzsgYyArPSBkZWMpIHtcbiAgICAgIGNvbnN0IHIyID0gTWF0aC5taW4ociArIGRlYywgcm93cyAtIDEpO1xuICAgICAgY29uc3QgYzIgPSBNYXRoLm1pbihjICsgZGVjLCBjb2xzIC0gMSk7XG4gICAgICBpZiAoIShpc05hTih2YWx1ZXNbciAqIGNvbHMgKyBjXSkgJiYgaXNOYU4odmFsdWVzW3IyICogY29scyArIGNdKSAmJlxuICAgICAgICAgICAgaXNOYU4odmFsdWVzW3IgKiBjb2xzICsgYzJdKSAmJiBpc05hTih2YWx1ZXNbcjIgKiBjb2xzICsgYzJdKSkpIHtcbiAgICAgICAgdHJpQ291bnQgKz0gMjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBwb3NBcnIgPSBuZXcgRmxvYXQzMkFycmF5KHRyaUNvdW50ICogOSk7XG4gIGNvbnN0IG5vcm1BcnIgPSBuZXcgRmxvYXQzMkFycmF5KHRyaUNvdW50ICogOSk7XG4gIGxldCBwdHIgPSAwO1xuXG4gIGNvbnN0IGdldFogPSAocjogbnVtYmVyLCBjOiBudW1iZXIpID0+IHtcbiAgICBjb25zdCB6ID0gd3pbciAqIGNvbHMgKyBjXTtcbiAgICByZXR1cm4gaXNOYU4oeikgPyBzZWFaIDogejtcbiAgfTtcblxuICBmb3IgKGxldCByID0gMDsgciA8IHJvd3MgLSBkZWM7IHIgKz0gZGVjKSB7XG4gICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzIC0gZGVjOyBjICs9IGRlYykge1xuICAgICAgY29uc3QgcjIgPSBNYXRoLm1pbihyICsgZGVjLCByb3dzIC0gMSk7XG4gICAgICBjb25zdCBjMiA9IE1hdGgubWluKGMgKyBkZWMsIGNvbHMgLSAxKTtcbiAgICAgIGNvbnN0IGkwMCA9IHIgKiBjb2xzICsgYywgaTEwID0gcjIgKiBjb2xzICsgYywgaTAxID0gciAqIGNvbHMgKyBjMiwgaTExID0gcjIgKiBjb2xzICsgYzI7XG4gICAgICBpZiAoaXNOYU4odmFsdWVzW2kwMF0pICYmIGlzTmFOKHZhbHVlc1tpMTBdKSAmJiBpc05hTih2YWx1ZXNbaTAxXSkgJiYgaXNOYU4odmFsdWVzW2kxMV0pKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgYXggPSB3eFtpMDBdLCBheSA9IHd5W2kwMF0sIGF6ID0gZ2V0WihyLCBjKTtcbiAgICAgIGNvbnN0IGJ4ID0gd3hbaTEwXSwgYnkgPSB3eVtpMTBdLCBieiA9IGdldFoocjIsIGMpO1xuICAgICAgY29uc3QgY3ggPSB3eFtpMDFdLCBjeSA9IHd5W2kwMV0sIGN6ID0gZ2V0WihyLCBjMik7XG4gICAgICBjb25zdCBkeCA9IHd4W2kxMV0sIGR5ID0gd3lbaTExXSwgZHogPSBnZXRaKHIyLCBjMik7XG5cbiAgICAgIC8vIFRyaWFuZ2xlIEEtQy1CXG4gICAgICB7XG4gICAgICAgIGNvbnN0IGUxeCA9IGN4LWF4LCBlMXkgPSBjeS1heSwgZTF6ID0gY3otYXo7XG4gICAgICAgIGNvbnN0IGUyeCA9IGJ4LWF4LCBlMnkgPSBieS1heSwgZTJ6ID0gYnotYXo7XG4gICAgICAgIGNvbnN0IFtueCwgbnksIG56XSA9IG5vcm1hbGl6ZTMoY3Jvc3MoZTF4LCBlMXksIGUxeiwgZTJ4LCBlMnksIGUyeikpO1xuICAgICAgICBwb3NBcnJbcHRyXT1heDsgcG9zQXJyW3B0cisxXT1heTsgcG9zQXJyW3B0cisyXT1hejtcbiAgICAgICAgcG9zQXJyW3B0ciszXT1jeDsgcG9zQXJyW3B0cis0XT1jeTsgcG9zQXJyW3B0cis1XT1jejtcbiAgICAgICAgcG9zQXJyW3B0cis2XT1ieDsgcG9zQXJyW3B0cis3XT1ieTsgcG9zQXJyW3B0cis4XT1iejtcbiAgICAgICAgbm9ybUFycltwdHJdPW54OyBub3JtQXJyW3B0cisxXT1ueTsgbm9ybUFycltwdHIrMl09bno7XG4gICAgICAgIG5vcm1BcnJbcHRyKzNdPW54OyBub3JtQXJyW3B0cis0XT1ueTsgbm9ybUFycltwdHIrNV09bno7XG4gICAgICAgIG5vcm1BcnJbcHRyKzZdPW54OyBub3JtQXJyW3B0cis3XT1ueTsgbm9ybUFycltwdHIrOF09bno7XG4gICAgICAgIHB0ciArPSA5O1xuICAgICAgfVxuICAgICAgLy8gVHJpYW5nbGUgQi1DLURcbiAgICAgIHtcbiAgICAgICAgY29uc3QgZTF4ID0gY3gtYngsIGUxeSA9IGN5LWJ5LCBlMXogPSBjei1iejtcbiAgICAgICAgY29uc3QgZTJ4ID0gZHgtYngsIGUyeSA9IGR5LWJ5LCBlMnogPSBkei1iejtcbiAgICAgICAgY29uc3QgW254LCBueSwgbnpdID0gbm9ybWFsaXplMyhjcm9zcyhlMXgsIGUxeSwgZTF6LCBlMngsIGUyeSwgZTJ6KSk7XG4gICAgICAgIHBvc0FycltwdHJdPWJ4OyBwb3NBcnJbcHRyKzFdPWJ5OyBwb3NBcnJbcHRyKzJdPWJ6O1xuICAgICAgICBwb3NBcnJbcHRyKzNdPWN4OyBwb3NBcnJbcHRyKzRdPWN5OyBwb3NBcnJbcHRyKzVdPWN6O1xuICAgICAgICBwb3NBcnJbcHRyKzZdPWR4OyBwb3NBcnJbcHRyKzddPWR5OyBwb3NBcnJbcHRyKzhdPWR6O1xuICAgICAgICBub3JtQXJyW3B0cl09bng7IG5vcm1BcnJbcHRyKzFdPW55OyBub3JtQXJyW3B0cisyXT1uejtcbiAgICAgICAgbm9ybUFycltwdHIrM109bng7IG5vcm1BcnJbcHRyKzRdPW55OyBub3JtQXJyW3B0cis1XT1uejtcbiAgICAgICAgbm9ybUFycltwdHIrNl09bng7IG5vcm1BcnJbcHRyKzddPW55OyBub3JtQXJyW3B0cis4XT1uejtcbiAgICAgICAgcHRyICs9IDk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBtZXNoOiB7XG4gICAgICBwb3NpdGlvbnM6IHBvc0FycixcbiAgICAgIG5vcm1hbHM6IG5vcm1BcnIsXG4gICAgICB0cmlhbmdsZUNvdW50OiB0cmlDb3VudCxcbiAgICB9LFxuICAgIGJhc2VaLFxuICB9O1xufVxuIl0sIm5hbWVzIjpbImNvbXB1dGVXb3JsZEdyaWQiLCJjcm9zcyIsImF4IiwiYXkiLCJheiIsImJ4IiwiYnkiLCJieiIsIm5vcm1hbGl6ZTMiLCJ2IiwibGVuIiwiTWF0aCIsInNxcnQiLCJidWlsZFRlcnJhaW5NZXNoIiwiZGVtR3JpZCIsInBhcmFtcyIsImNvbHMiLCJyb3dzIiwidmFsdWVzIiwiZGVjIiwiZGVjaW1hdGlvbiIsInd4Iiwid3kiLCJ3eiIsIm1pblZhbGlkWiIsIkluZmluaXR5IiwiaSIsImxlbmd0aCIsImlzTmFOIiwiaXNGaW5pdGUiLCJiYXNlWiIsImJhc2VUaGlja25lc3MiLCJ4eVNjYWxlIiwic2VhWiIsInpTY2FsZSIsInRyaUNvdW50IiwiciIsImMiLCJyMiIsIm1pbiIsImMyIiwicG9zQXJyIiwiRmxvYXQzMkFycmF5Iiwibm9ybUFyciIsInB0ciIsImdldFoiLCJ6IiwiaTAwIiwiaTEwIiwiaTAxIiwiaTExIiwiY3giLCJjeSIsImN6IiwiZHgiLCJkeSIsImR6IiwiZTF4IiwiZTF5IiwiZTF6IiwiZTJ4IiwiZTJ5IiwiZTJ6IiwibngiLCJueSIsIm56IiwibWVzaCIsInBvc2l0aW9ucyIsIm5vcm1hbHMiLCJ0cmlhbmdsZUNvdW50Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/mesh/terrain.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./lib/mesh/text.ts":
/*!**************************!*\
  !*** ./lib/mesh/text.ts ***!
  \**************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   buildTextMesh: function() { return /* binding */ buildTextMesh; }\n/* harmony export */ });\n/* harmony import */ var earcut__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! earcut */ \"(app-pages-browser)/./node_modules/earcut/src/earcut.js\");\n/* harmony import */ var earcut__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(earcut__WEBPACK_IMPORTED_MODULE_0__);\n\nfunction signedArea(pts) {\n    let area = 0;\n    for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){\n        area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];\n    }\n    return area / 2;\n}\nfunction quadraticBezier(p0, p1, p2, steps) {\n    const pts = [];\n    for(let i = 0; i <= steps; i++){\n        const t = i / steps;\n        const x = (1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0];\n        const y = (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1];\n        pts.push([\n            x,\n            y\n        ]);\n    }\n    return pts;\n}\nfunction cubicBezier(p0, p1, p2, p3, steps) {\n    const pts = [];\n    for(let i = 0; i <= steps; i++){\n        const t = i / steps;\n        const mt = 1 - t;\n        const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];\n        const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];\n        pts.push([\n            x,\n            y\n        ]);\n    }\n    return pts;\n}\n// eslint-disable-next-line @typescript-eslint/no-explicit-any\nfunction pathToContours(path, curveSteps) {\n    const contours = [];\n    let current = [];\n    let cx = 0, cy = 0;\n    for (const cmd of path.commands){\n        if (cmd.type === \"M\") {\n            if (current.length > 2) contours.push(current);\n            current = [\n                [\n                    cmd.x,\n                    cmd.y\n                ]\n            ];\n            cx = cmd.x;\n            cy = cmd.y;\n        } else if (cmd.type === \"L\") {\n            current.push([\n                cmd.x,\n                cmd.y\n            ]);\n            cx = cmd.x;\n            cy = cmd.y;\n        } else if (cmd.type === \"Q\") {\n            const pts = quadraticBezier([\n                cx,\n                cy\n            ], [\n                cmd.x1,\n                cmd.y1\n            ], [\n                cmd.x,\n                cmd.y\n            ], curveSteps);\n            current.push(...pts.slice(1));\n            cx = cmd.x;\n            cy = cmd.y;\n        } else if (cmd.type === \"C\") {\n            const pts = cubicBezier([\n                cx,\n                cy\n            ], [\n                cmd.x1,\n                cmd.y1\n            ], [\n                cmd.x2,\n                cmd.y2\n            ], [\n                cmd.x,\n                cmd.y\n            ], curveSteps);\n            current.push(...pts.slice(1));\n            cx = cmd.x;\n            cy = cmd.y;\n        } else if (cmd.type === \"Z\") {\n            if (current.length > 2) contours.push(current);\n            current = [];\n            cx = 0;\n            cy = 0;\n        }\n    }\n    if (current.length > 2) contours.push(current);\n    return contours;\n}\nasync function buildTextMesh(text, fontBuffer, centerX, centerY, baseZ, params) {\n    if (params.textMode === \"none\") return null;\n    // Dynamic import to avoid SSR issues\n    const opentype = await __webpack_require__.e(/*! import() */ \"_app-pages-browser_node_modules_opentype_js_dist_opentype_module_js\").then(__webpack_require__.bind(__webpack_require__, /*! opentype.js */ \"(app-pages-browser)/./node_modules/opentype.js/dist/opentype.module.js\"));\n    const font = opentype.parse(fontBuffer);\n    const fontSize = params.fontSize * params.xyScale;\n    const curveSteps = Math.max(4, Math.round(fontSize * 50000 / 20));\n    const textDepthWorld = params.textDepth * params.xyScale;\n    const dir = params.textMode === \"emboss\" ? 1 : -1;\n    // Lay out characters horizontally\n    let xOffset = 0;\n    const glyphs = [];\n    let totalWidth = 0;\n    for (const ch of text){\n        const glyph = font.charToGlyph(ch);\n        const path = glyph.getPath(0, 0, fontSize);\n        var _glyph_advanceWidth;\n        const advance = ((_glyph_advanceWidth = glyph.advanceWidth) !== null && _glyph_advanceWidth !== void 0 ? _glyph_advanceWidth : 0) * fontSize / font.unitsPerEm;\n        const contours = pathToContours(path, curveSteps);\n        glyphs.push({\n            contours,\n            advance\n        });\n        totalWidth += advance;\n    }\n    const startX = centerX - totalWidth / 2;\n    const posArr = [];\n    const normArr = [];\n    for (const { contours, advance } of glyphs){\n        // Y negate (opentype Y-down → world Y-up)\n        const flipped = contours.map((ring)=>ring.map((param)=>{\n                let [x, y] = param;\n                return [\n                    startX + xOffset + x,\n                    centerY - y\n                ];\n            }));\n        const outers = [];\n        const holes = [];\n        for (const ring of flipped){\n            if (signedArea(ring) >= 0) outers.push(ring);\n            else holes.push(ring);\n        }\n        for (const outer of outers){\n            const ringsForEarcut = [\n                outer\n            ];\n            for (const hole of holes)ringsForEarcut.push(hole);\n            const flatVerts = [];\n            const holeIndices = [];\n            for(let ri = 0; ri < ringsForEarcut.length; ri++){\n                if (ri > 0) holeIndices.push(flatVerts.length / 2);\n                for (const [x, y] of ringsForEarcut[ri])flatVerts.push(x, y);\n            }\n            const indices = earcut__WEBPACK_IMPORTED_MODULE_0___default()(flatVerts, holeIndices, 2);\n            const topZ = baseZ + dir * textDepthWorld;\n            for(let i = 0; i < indices.length; i += 3){\n                const i0 = indices[i] * 2, i1 = indices[i + 1] * 2, i2 = indices[i + 2] * 2;\n                posArr.push(flatVerts[i0], flatVerts[i0 + 1], topZ);\n                posArr.push(flatVerts[i1], flatVerts[i1 + 1], topZ);\n                posArr.push(flatVerts[i2], flatVerts[i2 + 1], topZ);\n                normArr.push(0, 0, dir, 0, 0, dir, 0, 0, dir);\n            }\n        }\n        xOffset += advance;\n    }\n    if (posArr.length === 0) return null;\n    return {\n        positions: new Float32Array(posArr),\n        normals: new Float32Array(normArr),\n        triangleCount: posArr.length / 9\n    };\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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dkUsTUFBTSxFQUFFRixLQUFLLEVBQUc7Z0JBQzFDLE1BQU0yRSxLQUFLRixPQUFPLENBQUN6RSxFQUFFLEdBQUcsR0FBRzRFLEtBQUtILE9BQU8sQ0FBQ3pFLElBQUksRUFBRSxHQUFHLEdBQUc2RSxLQUFLSixPQUFPLENBQUN6RSxJQUFJLEVBQUUsR0FBRztnQkFDMUU0RCxPQUFPakQsSUFBSSxDQUFDMkQsU0FBUyxDQUFDSyxHQUFHLEVBQUVMLFNBQVMsQ0FBQ0ssS0FBSyxFQUFFLEVBQUVEO2dCQUM5Q2QsT0FBT2pELElBQUksQ0FBQzJELFNBQVMsQ0FBQ00sR0FBRyxFQUFFTixTQUFTLENBQUNNLEtBQUssRUFBRSxFQUFFRjtnQkFDOUNkLE9BQU9qRCxJQUFJLENBQUMyRCxTQUFTLENBQUNPLEdBQUcsRUFBRVAsU0FBUyxDQUFDTyxLQUFLLEVBQUUsRUFBRUg7Z0JBQzlDYixRQUFRbEQsSUFBSSxDQUFDLEdBQUcsR0FBR3FDLEtBQUssR0FBRyxHQUFHQSxLQUFLLEdBQUcsR0FBR0E7WUFDM0M7UUFDRjtRQUNBQyxXQUFXTztJQUNiO0lBRUEsSUFBSUksT0FBTzFELE1BQU0sS0FBSyxHQUFHLE9BQU87SUFDaEMsT0FBTztRQUNMNEUsV0FBVyxJQUFJQyxhQUFhbkI7UUFDNUJvQixTQUFTLElBQUlELGFBQWFsQjtRQUMxQm9CLGVBQWVyQixPQUFPMUQsTUFBTSxHQUFHO0lBQ2pDO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbGliL21lc2gvdGV4dC50cz85NTY2Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgTWVzaEdlbmVyYXRpb25QYXJhbXMsIFRyaWFuZ2xlU291cCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCBlYXJjdXQgZnJvbSAnZWFyY3V0JztcblxuZnVuY3Rpb24gc2lnbmVkQXJlYShwdHM6IFtudW1iZXIsIG51bWJlcl1bXSk6IG51bWJlciB7XG4gIGxldCBhcmVhID0gMDtcbiAgZm9yIChsZXQgaSA9IDAsIGogPSBwdHMubGVuZ3RoIC0gMTsgaSA8IHB0cy5sZW5ndGg7IGogPSBpKyspIHtcbiAgICBhcmVhICs9IHB0c1tqXVswXSAqIHB0c1tpXVsxXSAtIHB0c1tpXVswXSAqIHB0c1tqXVsxXTtcbiAgfVxuICByZXR1cm4gYXJlYSAvIDI7XG59XG5cbmZ1bmN0aW9uIHF1YWRyYXRpY0JlemllcihwMDogW251bWJlciwgbnVtYmVyXSwgcDE6IFtudW1iZXIsIG51bWJlcl0sIHAyOiBbbnVtYmVyLCBudW1iZXJdLCBzdGVwczogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXVtdIHtcbiAgY29uc3QgcHRzOiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPD0gc3RlcHM7IGkrKykge1xuICAgIGNvbnN0IHQgPSBpIC8gc3RlcHM7XG4gICAgY29uc3QgeCA9ICgxIC0gdCkgKiAoMSAtIHQpICogcDBbMF0gKyAyICogdCAqICgxIC0gdCkgKiBwMVswXSArIHQgKiB0ICogcDJbMF07XG4gICAgY29uc3QgeSA9ICgxIC0gdCkgKiAoMSAtIHQpICogcDBbMV0gKyAyICogdCAqICgxIC0gdCkgKiBwMVsxXSArIHQgKiB0ICogcDJbMV07XG4gICAgcHRzLnB1c2goW3gsIHldKTtcbiAgfVxuICByZXR1cm4gcHRzO1xufVxuXG5mdW5jdGlvbiBjdWJpY0JlemllcihwMDogW251bWJlciwgbnVtYmVyXSwgcDE6IFtudW1iZXIsIG51bWJlcl0sIHAyOiBbbnVtYmVyLCBudW1iZXJdLCBwMzogW251bWJlciwgbnVtYmVyXSwgc3RlcHM6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl1bXSB7XG4gIGNvbnN0IHB0czogW251bWJlciwgbnVtYmVyXVtdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IHN0ZXBzOyBpKyspIHtcbiAgICBjb25zdCB0ID0gaSAvIHN0ZXBzO1xuICAgIGNvbnN0IG10ID0gMSAtIHQ7XG4gICAgY29uc3QgeCA9IG10ICogbXQgKiBtdCAqIHAwWzBdICsgMyAqIG10ICogbXQgKiB0ICogcDFbMF0gKyAzICogbXQgKiB0ICogdCAqIHAyWzBdICsgdCAqIHQgKiB0ICogcDNbMF07XG4gICAgY29uc3QgeSA9IG10ICogbXQgKiBtdCAqIHAwWzFdICsgMyAqIG10ICogbXQgKiB0ICogcDFbMV0gKyAzICogbXQgKiB0ICogdCAqIHAyWzFdICsgdCAqIHQgKiB0ICogcDNbMV07XG4gICAgcHRzLnB1c2goW3gsIHldKTtcbiAgfVxuICByZXR1cm4gcHRzO1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gcGF0aFRvQ29udG91cnMocGF0aDogYW55LCBjdXJ2ZVN0ZXBzOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdW11bXSB7XG4gIGNvbnN0IGNvbnRvdXJzOiBbbnVtYmVyLCBudW1iZXJdW11bXSA9IFtdO1xuICBsZXQgY3VycmVudDogW251bWJlciwgbnVtYmVyXVtdID0gW107XG4gIGxldCBjeCA9IDAsIGN5ID0gMDtcbiAgZm9yIChjb25zdCBjbWQgb2YgcGF0aC5jb21tYW5kcykge1xuICAgIGlmIChjbWQudHlwZSA9PT0gJ00nKSB7XG4gICAgICBpZiAoY3VycmVudC5sZW5ndGggPiAyKSBjb250b3Vycy5wdXNoKGN1cnJlbnQpO1xuICAgICAgY3VycmVudCA9IFtbY21kLngsIGNtZC55XV07XG4gICAgICBjeCA9IGNtZC54OyBjeSA9IGNtZC55O1xuICAgIH0gZWxzZSBpZiAoY21kLnR5cGUgPT09ICdMJykge1xuICAgICAgY3VycmVudC5wdXNoKFtjbWQueCwgY21kLnldKTtcbiAgICAgIGN4ID0gY21kLng7IGN5ID0gY21kLnk7XG4gICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ1EnKSB7XG4gICAgICBjb25zdCBwdHMgPSBxdWFkcmF0aWNCZXppZXIoW2N4LCBjeV0sIFtjbWQueDEsIGNtZC55MV0sIFtjbWQueCwgY21kLnldLCBjdXJ2ZVN0ZXBzKTtcbiAgICAgIGN1cnJlbnQucHVzaCguLi5wdHMuc2xpY2UoMSkpO1xuICAgICAgY3ggPSBjbWQueDsgY3kgPSBjbWQueTtcbiAgICB9IGVsc2UgaWYgKGNtZC50eXBlID09PSAnQycpIHtcbiAgICAgIGNvbnN0IHB0cyA9IGN1YmljQmV6aWVyKFtjeCwgY3ldLCBbY21kLngxLCBjbWQueTFdLCBbY21kLngyLCBjbWQueTJdLCBbY21kLngsIGNtZC55XSwgY3VydmVTdGVwcyk7XG4gICAgICBjdXJyZW50LnB1c2goLi4ucHRzLnNsaWNlKDEpKTtcbiAgICAgIGN4ID0gY21kLng7IGN5ID0gY21kLnk7XG4gICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ1onKSB7XG4gICAgICBpZiAoY3VycmVudC5sZW5ndGggPiAyKSBjb250b3Vycy5wdXNoKGN1cnJlbnQpO1xuICAgICAgY3VycmVudCA9IFtdO1xuICAgICAgY3ggPSAwOyBjeSA9IDA7XG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50Lmxlbmd0aCA+IDIpIGNvbnRvdXJzLnB1c2goY3VycmVudCk7XG4gIHJldHVybiBjb250b3Vycztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJ1aWxkVGV4dE1lc2goXG4gIHRleHQ6IHN0cmluZyxcbiAgZm9udEJ1ZmZlcjogQXJyYXlCdWZmZXIsXG4gIGNlbnRlclg6IG51bWJlcixcbiAgY2VudGVyWTogbnVtYmVyLFxuICBiYXNlWjogbnVtYmVyLFxuICBwYXJhbXM6IE1lc2hHZW5lcmF0aW9uUGFyYW1zLFxuKTogUHJvbWlzZTxUcmlhbmdsZVNvdXAgfCBudWxsPiB7XG4gIGlmIChwYXJhbXMudGV4dE1vZGUgPT09ICdub25lJykgcmV0dXJuIG51bGw7XG4gIC8vIER5bmFtaWMgaW1wb3J0IHRvIGF2b2lkIFNTUiBpc3N1ZXNcbiAgY29uc3Qgb3BlbnR5cGUgPSBhd2FpdCBpbXBvcnQoJ29wZW50eXBlLmpzJyk7XG4gIGNvbnN0IGZvbnQgPSBvcGVudHlwZS5wYXJzZShmb250QnVmZmVyKTtcblxuICBjb25zdCBmb250U2l6ZSA9IHBhcmFtcy5mb250U2l6ZSAqIHBhcmFtcy54eVNjYWxlO1xuICBjb25zdCBjdXJ2ZVN0ZXBzID0gTWF0aC5tYXgoNCwgTWF0aC5yb3VuZChmb250U2l6ZSAqIDUwMDAwIC8gMjApKTtcbiAgY29uc3QgdGV4dERlcHRoV29ybGQgPSBwYXJhbXMudGV4dERlcHRoICogcGFyYW1zLnh5U2NhbGU7XG4gIGNvbnN0IGRpciA9IHBhcmFtcy50ZXh0TW9kZSA9PT0gJ2VtYm9zcycgPyAxIDogLTE7XG5cbiAgLy8gTGF5IG91dCBjaGFyYWN0ZXJzIGhvcml6b250YWxseVxuICBsZXQgeE9mZnNldCA9IDA7XG4gIGNvbnN0IGdseXBoczogQXJyYXk8eyBjb250b3VyczogW251bWJlciwgbnVtYmVyXVtdW107IGFkdmFuY2U6IG51bWJlciB9PiA9IFtdO1xuICBsZXQgdG90YWxXaWR0aCA9IDA7XG4gIGZvciAoY29uc3QgY2ggb2YgdGV4dCkge1xuICAgIGNvbnN0IGdseXBoID0gZm9udC5jaGFyVG9HbHlwaChjaCk7XG4gICAgY29uc3QgcGF0aCA9IGdseXBoLmdldFBhdGgoMCwgMCwgZm9udFNpemUpO1xuICAgIGNvbnN0IGFkdmFuY2UgPSAoZ2x5cGguYWR2YW5jZVdpZHRoID8/IDApICogZm9udFNpemUgLyBmb250LnVuaXRzUGVyRW07XG4gICAgY29uc3QgY29udG91cnMgPSBwYXRoVG9Db250b3VycyhwYXRoLCBjdXJ2ZVN0ZXBzKTtcbiAgICBnbHlwaHMucHVzaCh7IGNvbnRvdXJzLCBhZHZhbmNlIH0pO1xuICAgIHRvdGFsV2lkdGggKz0gYWR2YW5jZTtcbiAgfVxuXG4gIGNvbnN0IHN0YXJ0WCA9IGNlbnRlclggLSB0b3RhbFdpZHRoIC8gMjtcbiAgY29uc3QgcG9zQXJyOiBudW1iZXJbXSA9IFtdO1xuICBjb25zdCBub3JtQXJyOiBudW1iZXJbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgeyBjb250b3VycywgYWR2YW5jZSB9IG9mIGdseXBocykge1xuICAgIC8vIFkgbmVnYXRlIChvcGVudHlwZSBZLWRvd24g4oaSIHdvcmxkIFktdXApXG4gICAgY29uc3QgZmxpcHBlZDogW251bWJlciwgbnVtYmVyXVtdW10gPSBjb250b3Vycy5tYXAocmluZyA9PlxuICAgICAgcmluZy5tYXAoKFt4LCB5XSkgPT4gW3N0YXJ0WCArIHhPZmZzZXQgKyB4LCBjZW50ZXJZIC0geV0pXG4gICAgKTtcblxuICAgIGNvbnN0IG91dGVyczogW251bWJlciwgbnVtYmVyXVtdW10gPSBbXTtcbiAgICBjb25zdCBob2xlczogW251bWJlciwgbnVtYmVyXVtdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJpbmcgb2YgZmxpcHBlZCkge1xuICAgICAgaWYgKHNpZ25lZEFyZWEocmluZykgPj0gMCkgb3V0ZXJzLnB1c2gocmluZyk7IGVsc2UgaG9sZXMucHVzaChyaW5nKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG91dGVyIG9mIG91dGVycykge1xuICAgICAgY29uc3QgcmluZ3NGb3JFYXJjdXQ6IFtudW1iZXIsIG51bWJlcl1bXVtdID0gW291dGVyXTtcbiAgICAgIGZvciAoY29uc3QgaG9sZSBvZiBob2xlcykgcmluZ3NGb3JFYXJjdXQucHVzaChob2xlKTtcblxuICAgICAgY29uc3QgZmxhdFZlcnRzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgY29uc3QgaG9sZUluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgICBmb3IgKGxldCByaSA9IDA7IHJpIDwgcmluZ3NGb3JFYXJjdXQubGVuZ3RoOyByaSsrKSB7XG4gICAgICAgIGlmIChyaSA+IDApIGhvbGVJbmRpY2VzLnB1c2goZmxhdFZlcnRzLmxlbmd0aCAvIDIpO1xuICAgICAgICBmb3IgKGNvbnN0IFt4LCB5XSBvZiByaW5nc0ZvckVhcmN1dFtyaV0pIGZsYXRWZXJ0cy5wdXNoKHgsIHkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbmRpY2VzID0gZWFyY3V0KGZsYXRWZXJ0cywgaG9sZUluZGljZXMsIDIpO1xuICAgICAgY29uc3QgdG9wWiA9IGJhc2VaICsgZGlyICogdGV4dERlcHRoV29ybGQ7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjb25zdCBpMCA9IGluZGljZXNbaV0gKiAyLCBpMSA9IGluZGljZXNbaSArIDFdICogMiwgaTIgPSBpbmRpY2VzW2kgKyAyXSAqIDI7XG4gICAgICAgIHBvc0Fyci5wdXNoKGZsYXRWZXJ0c1tpMF0sIGZsYXRWZXJ0c1tpMCArIDFdLCB0b3BaKTtcbiAgICAgICAgcG9zQXJyLnB1c2goZmxhdFZlcnRzW2kxXSwgZmxhdFZlcnRzW2kxICsgMV0sIHRvcFopO1xuICAgICAgICBwb3NBcnIucHVzaChmbGF0VmVydHNbaTJdLCBmbGF0VmVydHNbaTIgKyAxXSwgdG9wWik7XG4gICAgICAgIG5vcm1BcnIucHVzaCgwLCAwLCBkaXIsIDAsIDAsIGRpciwgMCwgMCwgZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgeE9mZnNldCArPSBhZHZhbmNlO1xuICB9XG5cbiAgaWYgKHBvc0Fyci5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIHBvc2l0aW9uczogbmV3IEZsb2F0MzJBcnJheShwb3NBcnIpLFxuICAgIG5vcm1hbHM6IG5ldyBGbG9hdDMyQXJyYXkobm9ybUFyciksXG4gICAgdHJpYW5nbGVDb3VudDogcG9zQXJyLmxlbmd0aCAvIDksXG4gIH07XG59XG4iXSwibmFtZXMiOlsiZWFyY3V0Iiwic2lnbmVkQXJlYSIsInB0cyIsImFyZWEiLCJpIiwiaiIsImxlbmd0aCIsInF1YWRyYXRpY0JlemllciIsInAwIiwicDEiLCJwMiIsInN0ZXBzIiwidCIsIngiLCJ5IiwicHVzaCIsImN1YmljQmV6aWVyIiwicDMiLCJtdCIsInBhdGhUb0NvbnRvdXJzIiwicGF0aCIsImN1cnZlU3RlcHMiLCJjb250b3VycyIsImN1cnJlbnQiLCJjeCIsImN5IiwiY21kIiwiY29tbWFuZHMiLCJ0eXBlIiwieDEiLCJ5MSIsInNsaWNlIiwieDIiLCJ5MiIsImJ1aWxkVGV4dE1lc2giLCJ0ZXh0IiwiZm9udEJ1ZmZlciIsImNlbnRlclgiLCJjZW50ZXJZIiwiYmFzZVoiLCJwYXJhbXMiLCJ0ZXh0TW9kZSIsIm9wZW50eXBlIiwiZm9udCIsInBhcnNlIiwiZm9udFNpemUiLCJ4eVNjYWxlIiwiTWF0aCIsIm1heCIsInJvdW5kIiwidGV4dERlcHRoV29ybGQiLCJ0ZXh0RGVwdGgiLCJkaXIiLCJ4T2Zmc2V0IiwiZ2x5cGhzIiwidG90YWxXaWR0aCIsImNoIiwiZ2x5cGgiLCJjaGFyVG9HbHlwaCIsImdldFBhdGgiLCJhZHZhbmNlIiwiYWR2YW5jZVdpZHRoIiwidW5pdHNQZXJFbSIsInN0YXJ0WCIsInBvc0FyciIsIm5vcm1BcnIiLCJmbGlwcGVkIiwibWFwIiwicmluZyIsIm91dGVycyIsImhvbGVzIiwib3V0ZXIiLCJyaW5nc0ZvckVhcmN1dCIsImhvbGUiLCJmbGF0VmVydHMiLCJob2xlSW5kaWNlcyIsInJpIiwiaW5kaWNlcyIsInRvcFoiLCJpMCIsImkxIiwiaTIiLCJwb3NpdGlvbnMiLCJGbG9hdDMyQXJyYXkiLCJub3JtYWxzIiwidHJpYW5nbGVDb3VudCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/mesh/text.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./workers/mesh.worker.ts":
/*!********************************!*\
  !*** ./workers/mesh.worker.ts ***!
  \********************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _lib_geo_clip__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/geo/clip */ \"(app-pages-browser)/./lib/geo/clip.ts\");\n/* harmony import */ var _lib_mesh_terrain__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/mesh/terrain */ \"(app-pages-browser)/./lib/mesh/terrain.ts\");\n/* harmony import */ var _lib_mesh_solid__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/mesh/solid */ \"(app-pages-browser)/./lib/mesh/solid.ts\");\n/* harmony import */ var _lib_mesh_text__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/mesh/text */ \"(app-pages-browser)/./lib/mesh/text.ts\");\n/* harmony import */ var _lib_mesh_stl__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/mesh/stl */ \"(app-pages-browser)/./lib/mesh/stl.ts\");\n/* harmony import */ var _lib_constants_kanto__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/constants/kanto */ \"(app-pages-browser)/./lib/constants/kanto.ts\");\n/// <reference lib=\"webworker\" />\n\n\n\n\n\n\nfunction b64ToFloat32(b64) {\n    const bin = atob(b64);\n    const buf = new ArrayBuffer(bin.length);\n    const u8 = new Uint8Array(buf);\n    for(let i = 0; i < bin.length; i++)u8[i] = bin.charCodeAt(i);\n    return new Float32Array(buf);\n}\nfunction float32ToB64(arr) {\n    const u8 = new Uint8Array(arr.buffer);\n    let str = \"\";\n    for(let i = 0; i < u8.length; i++)str += String.fromCharCode(u8[i]);\n    return btoa(str);\n}\nfunction bufToB64(buf) {\n    const u8 = new Uint8Array(buf);\n    let str = \"\";\n    for(let i = 0; i < u8.length; i++)str += String.fromCharCode(u8[i]);\n    return btoa(str);\n}\nfunction progress(code, phase, prog) {\n    self.postMessage({\n        type: \"progress\",\n        code,\n        phase,\n        progress: prog\n    });\n}\nfunction featureToPolygons(feature, code) {\n    const geom = feature.geometry;\n    const polygons = [];\n    function addPolygon(coords) {\n        const rings = coords.map((ring)=>ring.map((param)=>{\n                let [lon, lat] = param;\n                return [\n                    lon,\n                    lat\n                ];\n            }));\n        // Filter Tokyo islands\n        if (code === \"13\") {\n            const outer = rings[0];\n            let sumLon = 0, sumLat = 0;\n            for (const [lon, lat] of outer){\n                sumLon += lon;\n                sumLat += lat;\n            }\n            const cLon = sumLon / outer.length, cLat = sumLat / outer.length;\n            const b = _lib_constants_kanto__WEBPACK_IMPORTED_MODULE_5__.TOKYO_PUZZLE_BBOX;\n            if (cLon < b.minLon || cLon > b.maxLon || cLat < b.minLat || cLat > b.maxLat) return;\n        }\n        polygons.push(rings);\n    }\n    if (geom.type === \"Polygon\") addPolygon(geom.coordinates);\n    else if (geom.type === \"MultiPolygon\") {\n        for (const poly of geom.coordinates)addPolygon(poly);\n    }\n    return polygons;\n}\nself.onmessage = async (evt)=>{\n    const { type, code, boundary, demGrid: demGridMsg, params, fontBase64 } = evt.data;\n    if (type !== \"generate\") return;\n    try {\n        var _boundary_properties;\n        progress(code, \"clipping\", 0.1);\n        const demValues = b64ToFloat32(demGridMsg.valuesBase64);\n        const demGrid = {\n            bbox: demGridMsg.bbox,\n            cols: demGridMsg.cols,\n            rows: demGridMsg.rows,\n            values: demValues\n        };\n        const polygons = featureToPolygons(boundary, code);\n        progress(code, \"clipping\", 0.3);\n        const clipped = (0,_lib_geo_clip__WEBPACK_IMPORTED_MODULE_0__.clipDemToPolygon)(demGrid, polygons);\n        progress(code, \"meshing\", 0.5);\n        const { mesh: terrain, baseZ } = (0,_lib_mesh_terrain__WEBPACK_IMPORTED_MODULE_1__.buildTerrainMesh)(clipped, params);\n        progress(code, \"meshing\", 0.65);\n        const { walls, bottom } = (0,_lib_mesh_solid__WEBPACK_IMPORTED_MODULE_2__.buildSolidMesh)(clipped, params, baseZ);\n        progress(code, \"meshing\", 0.8);\n        // Centroid for text\n        let sumX = 0, sumY = 0, cnt = 0;\n        for(let i = 0; i < terrain.positions.length; i += 3){\n            sumX += terrain.positions[i];\n            sumY += terrain.positions[i + 1];\n            cnt++;\n        }\n        const cx = cnt > 0 ? sumX / cnt : 0, cy = cnt > 0 ? sumY / cnt : 0;\n        const fontBuffer = Uint8Array.from(atob(fontBase64), (c)=>c.charCodeAt(0)).buffer;\n        var _boundary_properties_N03_001;\n        const prefName = (_boundary_properties_N03_001 = (_boundary_properties = boundary.properties) === null || _boundary_properties === void 0 ? void 0 : _boundary_properties.N03_001) !== null && _boundary_properties_N03_001 !== void 0 ? _boundary_properties_N03_001 : code;\n        const textMesh = await (0,_lib_mesh_text__WEBPACK_IMPORTED_MODULE_3__.buildTextMesh)(prefName, fontBuffer, cx, cy, baseZ, params);\n        progress(code, \"meshing\", 0.9);\n        const soups = [\n            terrain,\n            walls,\n            bottom,\n            ...textMesh ? [\n                textMesh\n            ] : []\n        ];\n        const stlBuf = (0,_lib_mesh_stl__WEBPACK_IMPORTED_MODULE_4__.serializeStl)(soups);\n        // World bbox\n        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;\n        for (const s of soups){\n            for(let i = 0; i < s.positions.length; i += 3){\n                const x = s.positions[i], y = s.positions[i + 1], z = s.positions[i + 2];\n                if (x < minX) minX = x;\n                if (x > maxX) maxX = x;\n                if (y < minY) minY = y;\n                if (y > maxY) maxY = y;\n                if (z < minZ) minZ = z;\n                if (z > maxZ) maxZ = z;\n            }\n        }\n        const resp = {\n            type: \"done\",\n            code,\n            mesh: {\n                terrain: {\n                    posB64: float32ToB64(terrain.positions),\n                    normB64: float32ToB64(terrain.normals),\n                    count: terrain.triangleCount\n                },\n                walls: {\n                    posB64: float32ToB64(walls.positions),\n                    normB64: float32ToB64(walls.normals),\n                    count: walls.triangleCount\n                },\n                bottom: {\n                    posB64: float32ToB64(bottom.positions),\n                    normB64: float32ToB64(bottom.normals),\n                    count: bottom.triangleCount\n                },\n                text: textMesh ? {\n                    posB64: float32ToB64(textMesh.positions),\n                    normB64: float32ToB64(textMesh.normals),\n                    count: textMesh.triangleCount\n                } : null,\n                worldBBox: {\n                    minX,\n                    maxX,\n                    minY,\n                    maxY,\n                    minZ,\n                    maxZ\n                }\n            },\n            stlBase64: bufToB64(stlBuf)\n        };\n        self.postMessage(resp);\n    } catch (e) {\n        self.postMessage({\n            type: \"error\",\n            code,\n            errorMessage: String(e)\n        });\n    }\n};\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL3dvcmtlcnMvbWVzaC53b3JrZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBLGlDQUFpQztBQUdrQjtBQUNJO0FBQ0o7QUFDRjtBQUNGO0FBQ1k7QUFHM0QsU0FBU00sYUFBYUMsR0FBVztJQUMvQixNQUFNQyxNQUFNQyxLQUFLRjtJQUNqQixNQUFNRyxNQUFNLElBQUlDLFlBQVlILElBQUlJLE1BQU07SUFDdEMsTUFBTUMsS0FBSyxJQUFJQyxXQUFXSjtJQUMxQixJQUFLLElBQUlLLElBQUksR0FBR0EsSUFBSVAsSUFBSUksTUFBTSxFQUFFRyxJQUFLRixFQUFFLENBQUNFLEVBQUUsR0FBR1AsSUFBSVEsVUFBVSxDQUFDRDtJQUM1RCxPQUFPLElBQUlFLGFBQWFQO0FBQzFCO0FBRUEsU0FBU1EsYUFBYUMsR0FBaUI7SUFDckMsTUFBTU4sS0FBSyxJQUFJQyxXQUFXSyxJQUFJQyxNQUFNO0lBQ3BDLElBQUlDLE1BQU07SUFDVixJQUFLLElBQUlOLElBQUksR0FBR0EsSUFBSUYsR0FBR0QsTUFBTSxFQUFFRyxJQUFLTSxPQUFPQyxPQUFPQyxZQUFZLENBQUNWLEVBQUUsQ0FBQ0UsRUFBRTtJQUNwRSxPQUFPUyxLQUFLSDtBQUNkO0FBRUEsU0FBU0ksU0FBU2YsR0FBZ0I7SUFDaEMsTUFBTUcsS0FBSyxJQUFJQyxXQUFXSjtJQUMxQixJQUFJVyxNQUFNO0lBQ1YsSUFBSyxJQUFJTixJQUFJLEdBQUdBLElBQUlGLEdBQUdELE1BQU0sRUFBRUcsSUFBS00sT0FBT0MsT0FBT0MsWUFBWSxDQUFDVixFQUFFLENBQUNFLEVBQUU7SUFDcEUsT0FBT1MsS0FBS0g7QUFDZDtBQUVBLFNBQVNLLFNBQVNDLElBQVksRUFBRUMsS0FBOEIsRUFBRUMsSUFBWTtJQUMxRUMsS0FBS0MsV0FBVyxDQUFDO1FBQUVDLE1BQU07UUFBWUw7UUFBTUM7UUFBT0YsVUFBVUc7SUFBSztBQUNuRTtBQUlBLFNBQVNJLGtCQUFrQkMsT0FBZ0IsRUFBRVAs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QU07Z0JBQ0pDLFNBQVM7b0JBQUUrQixRQUFRdkYsYUFBYXdELFFBQVFPLFNBQVM7b0JBQUd5QixTQUFTeEYsYUFBYXdELFFBQVFpQyxPQUFPO29CQUFHQyxPQUFPbEMsUUFBUW1DLGFBQWE7Z0JBQUM7Z0JBQ3pIakMsT0FBUztvQkFBRTZCLFFBQVF2RixhQUFhMEQsTUFBTUssU0FBUztvQkFBS3lCLFNBQVN4RixhQUFhMEQsTUFBTStCLE9BQU87b0JBQUtDLE9BQU9oQyxNQUFNaUMsYUFBYTtnQkFBQztnQkFDdkhoQyxRQUFTO29CQUFFNEIsUUFBUXZGLGFBQWEyRCxPQUFPSSxTQUFTO29CQUFJeUIsU0FBU3hGLGFBQWEyRCxPQUFPOEIsT0FBTztvQkFBSUMsT0FBTy9CLE9BQU9nQyxhQUFhO2dCQUFDO2dCQUN4SEMsTUFBU3BCLFdBQVc7b0JBQUVlLFFBQVF2RixhQUFhd0UsU0FBU1QsU0FBUztvQkFBR3lCLFNBQVN4RixhQUFhd0UsU0FBU2lCLE9BQU87b0JBQUdDLE9BQU9sQixTQUFTbUIsYUFBYTtnQkFBQyxJQUFJO2dCQUMzSUUsV0FBVztvQkFBRWxCO29CQUFNRTtvQkFBTUM7b0JBQU1DO29CQUFNQztvQkFBTUM7Z0JBQUs7WUFDbEQ7WUFDQWEsV0FBV3ZGLFNBQVNtRTtRQUN0QjtRQUNBOUQsS0FBS0MsV0FBVyxDQUFDeUU7SUFDbkIsRUFBRSxPQUFPUyxHQUFHO1FBQ1ZuRixLQUFLQyxXQUFXLENBQUM7WUFBRUMsTUFBTTtZQUFTTDtZQUFNdUYsY0FBYzVGLE9BQU8yRjtRQUFHO0lBQ2xFO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vd29ya2Vycy9tZXNoLndvcmtlci50cz8wMmM2Il0sInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cIndlYndvcmtlclwiIC8+XG5pbXBvcnQgdHlwZSB7IFdvcmtlclJlcXVlc3QsIFdvcmtlclJlc3BvbnNlLCBCQm94LCBEZW1HcmlkIH0gZnJvbSAnLi4vbGliL3R5cGVzJztcbmltcG9ydCB7IGZldGNoRGVtVGlsZXMgfSBmcm9tICcuLi9saWIvZ2VvL3RpbGVzJztcbmltcG9ydCB7IGNsaXBEZW1Ub1BvbHlnb24gfSBmcm9tICcuLi9saWIvZ2VvL2NsaXAnO1xuaW1wb3J0IHsgYnVpbGRUZXJyYWluTWVzaCB9IGZyb20gJy4uL2xpYi9tZXNoL3RlcnJhaW4nO1xuaW1wb3J0IHsgYnVpbGRTb2xpZE1lc2ggfSBmcm9tICcuLi9saWIvbWVzaC9zb2xpZCc7XG5pbXBvcnQgeyBidWlsZFRleHRNZXNoIH0gZnJvbSAnLi4vbGliL21lc2gvdGV4dCc7XG5pbXBvcnQgeyBzZXJpYWxpemVTdGwgfSBmcm9tICcuLi9saWIvbWVzaC9zdGwnO1xuaW1wb3J0IHsgVE9LWU9fUFVaWkxFX0JCT1ggfSBmcm9tICcuLi9saWIvY29uc3RhbnRzL2thbnRvJztcbmltcG9ydCB0eXBlIHsgRmVhdHVyZSwgTXVsdGlQb2x5Z29uLCBQb2x5Z29uIH0gZnJvbSAnZ2VvanNvbic7XG5cbmZ1bmN0aW9uIGI2NFRvRmxvYXQzMihiNjQ6IHN0cmluZyk6IEZsb2F0MzJBcnJheSB7XG4gIGNvbnN0IGJpbiA9IGF0b2IoYjY0KTtcbiAgY29uc3QgYnVmID0gbmV3IEFycmF5QnVmZmVyKGJpbi5sZW5ndGgpO1xuICBjb25zdCB1OCA9IG5ldyBVaW50OEFycmF5KGJ1Zik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYmluLmxlbmd0aDsgaSsrKSB1OFtpXSA9IGJpbi5jaGFyQ29kZUF0KGkpO1xuICByZXR1cm4gbmV3IEZsb2F0MzJBcnJheShidWYpO1xufVxuXG5mdW5jdGlvbiBmbG9hdDMyVG9CNjQoYXJyOiBGbG9hdDMyQXJyYXkpOiBzdHJpbmcge1xuICBjb25zdCB1OCA9IG5ldyBVaW50OEFycmF5KGFyci5idWZmZXIpO1xuICBsZXQgc3RyID0gJyc7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdTgubGVuZ3RoOyBpKyspIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHU4W2ldKTtcbiAgcmV0dXJuIGJ0b2Eoc3RyKTtcbn1cblxuZnVuY3Rpb24gYnVmVG9CNjQoYnVmOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gIGNvbnN0IHU4ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKTtcbiAgbGV0IHN0ciA9ICcnO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHU4Lmxlbmd0aDsgaSsrKSBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSh1OFtpXSk7XG4gIHJldHVybiBidG9hKHN0cik7XG59XG5cbmZ1bmN0aW9uIHByb2dyZXNzKGNvZGU6IHN0cmluZywgcGhhc2U6IFdvcmtlclJlc3BvbnNlWydwaGFzZSddLCBwcm9nOiBudW1iZXIpIHtcbiAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6ICdwcm9ncmVzcycsIGNvZGUsIHBoYXNlLCBwcm9ncmVzczogcHJvZyB9IHNhdGlzZmllcyBXb3JrZXJSZXNwb25zZSk7XG59XG5cbnR5cGUgUmluZyA9IFtudW1iZXIsIG51bWJlcl1bXTtcblxuZnVuY3Rpb24gZmVhdHVyZVRvUG9seWdvbnMoZmVhdHVyZTogRmVhdHVyZSwgY29kZTogc3RyaW5nKTogUmluZ1tdW10ge1xuICBjb25zdCBnZW9tID0gZmVhdHVyZS5nZW9tZXRyeSBhcyBNdWx0aVBvbHlnb24gfCBQb2x5Z29uO1xuICBjb25zdCBwb2x5Z29uczogUmluZ1tdW10gPSBbXTtcblxuICBmdW5jdGlvbiBhZGRQb2x5Z29uKGNvb3JkczogbnVtYmVyW11bXVtdKSB7XG4gICAgY29uc3QgcmluZ3M6IFJpbmdbXSA9IGNvb3Jkcy5tYXAocmluZyA9PiByaW5nLm1hcCgoW2xvbiwgbGF0XSkgPT4gW2xvbiwgbGF0XSBhcyBbbnVtYmVyLCBudW1iZXJdKSk7XG4gICAgLy8gRmlsdGVyIFRva3lvIGlzbGFuZHNcbiAgICBpZiAoY29kZSA9PT0gJzEzJykge1xuICAgICAgY29uc3Qgb3V0ZXIgPSByaW5nc1swXTtcbiAgICAgIGxldCBzdW1Mb24gPSAwLCBzdW1MYXQgPSAwO1xuICAgICAgZm9yIChjb25zdCBbbG9uLCBsYXRdIG9mIG91dGVyKSB7IHN1bUxvbiArPSBsb247IHN1bUxhdCArPSBsYXQ7IH1cbiAgICAgIGNvbnN0IGNMb24gPSBzdW1Mb24gLyBvdXRlci5sZW5ndGgsIGNMYXQgPSBzdW1MYXQgLyBvdXRlci5sZW5ndGg7XG4gICAgICBjb25zdCBiID0gVE9LWU9fUFVaWkxFX0JCT1g7XG4gICAgICBpZiAoY0xvbiA8IGIubWluTG9uIHx8IGNMb24gPiBiLm1heExvbiB8fCBjTGF0IDwgYi5taW5MYXQgfHwgY0xhdCA+IGIubWF4TGF0KSByZXR1cm47XG4gICAgfVxuICAgIHBvbHlnb25zLnB1c2gocmluZ3MpO1xuICB9XG5cbiAgaWYgKGdlb20udHlwZSA9PT0gJ1BvbHlnb24nKSBhZGRQb2x5Z29uKGdlb20uY29vcmRpbmF0ZXMgYXMgbnVtYmVyW11bXVtdKTtcbiAgZWxzZSBpZiAoZ2VvbS50eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgIGZvciAoY29uc3QgcG9seSBvZiBnZW9tLmNvb3JkaW5hdGVzIGFzIG51bWJlcltdW11bXVtdKSBhZGRQb2x5Z29uKHBvbHkpO1xuICB9XG4gIHJldHVybiBwb2x5Z29ucztcbn1cblxuc2VsZi5vbm1lc3NhZ2UgPSBhc3luYyAoZXZ0OiBNZXNzYWdlRXZlbnQ8V29ya2VyUmVxdWVzdD4pID0+IHtcbiAgY29uc3QgeyB0eXBlLCBjb2RlLCBib3VuZGFyeSwgZGVtR3JpZDogZGVtR3JpZE1zZywgcGFyYW1zLCBmb250QmFzZTY0IH0gPSBldnQuZGF0YTtcbiAgaWYgKHR5cGUgIT09ICdnZW5lcmF0ZScpIHJldHVybjtcblxuICB0cnkge1xuICAgIHByb2dyZXNzKGNvZGUsICdjbGlwcGluZycsIDAuMSk7XG4gICAgY29uc3QgZGVtVmFsdWVzID0gYjY0VG9GbG9hdDMyKGRlbUdyaWRNc2cudmFsdWVzQmFzZTY0KTtcbiAgICBjb25zdCBkZW1HcmlkOiBEZW1HcmlkID0geyBiYm94OiBkZW1HcmlkTXNnLmJib3gsIGNvbHM6IGRlbUdyaWRNc2cuY29scywgcm93czogZGVtR3JpZE1zZy5yb3dzLCB2YWx1ZXM6IGRlbVZhbHVlcyB9O1xuXG4gICAgY29uc3QgcG9seWdvbnMgPSBmZWF0dXJlVG9Qb2x5Z29ucyhib3VuZGFyeSwgY29kZSk7XG5cbiAgICBwcm9ncmVzcyhjb2RlLCAnY2xpcHBpbmcnLCAwLjMpO1xuICAgIGNvbnN0IGNsaXBwZWQgPSBjbGlwRGVtVG9Qb2x5Z29uKGRlbUdyaWQsIHBvbHlnb25zKTtcblxuICAgIHByb2dyZXNzKGNvZGUsICdtZXNoaW5nJywgMC41KTtcbiAgICBjb25zdCB7IG1lc2g6IHRlcnJhaW4sIGJhc2VaIH0gPSBidWlsZFRlcnJhaW5NZXNoKGNsaXBwZWQsIHBhcmFtcyk7XG5cbiAgICBwcm9ncmVzcyhjb2RlLCAnbWVzaGluZycsIDAuNjUpO1xuICAgIGNvbnN0IHsgd2FsbHMsIGJvdHRvbSB9ID0gYnVpbGRTb2xpZE1lc2goY2xpcHBlZCwgcGFyYW1zLCBiYXNlWik7XG5cbiAgICBwcm9ncmVzcyhjb2RlLCAnbWVzaGluZycsIDAuOCk7XG4gICAgLy8gQ2VudHJvaWQgZm9yIHRleHRcbiAgICBsZXQgc3VtWCA9IDAsIHN1bVkgPSAwLCBjbnQgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVycmFpbi5wb3NpdGlvbnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgIHN1bVggKz0gdGVycmFpbi5wb3NpdGlvbnNbaV07IHN1bVkgKz0gdGVycmFpbi5wb3NpdGlvbnNbaSArIDFdOyBjbnQrKztcbiAgICB9XG4gICAgY29uc3QgY3ggPSBjbnQgPiAwID8gc3VtWCAvIGNudCA6IDAsIGN5ID0gY250ID4gMCA/IHN1bVkgLyBjbnQgOiAwO1xuXG4gICAgY29uc3QgZm9udEJ1ZmZlciA9IFVpbnQ4QXJyYXkuZnJvbShhdG9iKGZvbnRCYXNlNjQpLCBjID0+IGMuY2hhckNvZGVBdCgwKSkuYnVmZmVyO1xuICAgIGNvbnN0IHByZWZOYW1lID0gYm91bmRhcnkucHJvcGVydGllcz8uTjAzXzAwMSBhcyBzdHJpbmcgPz8gY29kZTtcbiAgICBjb25zdCB0ZXh0TWVzaCA9IGF3YWl0IGJ1aWxkVGV4dE1lc2gocHJlZk5hbWUsIGZvbnRCdWZmZXIsIGN4LCBjeSwgYmFzZVosIHBhcmFtcyk7XG5cbiAgICBwcm9ncmVzcyhjb2RlLCAnbWVzaGluZycsIDAuOSk7XG4gICAgY29uc3Qgc291cHMgPSBbdGVycmFpbiwgd2FsbHMsIGJvdHRvbSwgLi4uKHRleHRNZXNoID8gW3RleHRNZXNoXSA6IFtdKV07XG4gICAgY29uc3Qgc3RsQnVmID0gc2VyaWFsaXplU3RsKHNvdXBzKTtcblxuICAgIC8vIFdvcmxkIGJib3hcbiAgICBsZXQgbWluWCA9IEluZmluaXR5LCBtYXhYID0gLUluZmluaXR5LCBtaW5ZID0gSW5maW5pdHksIG1heFkgPSAtSW5maW5pdHksIG1pblogPSBJbmZpbml0eSwgbWF4WiA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGNvbnN0IHMgb2Ygc291cHMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcy5wb3NpdGlvbnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY29uc3QgeCA9IHMucG9zaXRpb25zW2ldLCB5ID0gcy5wb3NpdGlvbnNbaSArIDFdLCB6ID0gcy5wb3NpdGlvbnNbaSArIDJdO1xuICAgICAgICBpZiAoeCA8IG1pblgpIG1pblggPSB4OyBpZiAoeCA+IG1heFgpIG1heFggPSB4O1xuICAgICAgICBpZiAoeSA8IG1pblkpIG1pblkgPSB5OyBpZiAoeSA+IG1heFkpIG1heFkgPSB5O1xuICAgICAgICBpZiAoeiA8IG1pblopIG1pblogPSB6OyBpZiAoeiA+IG1heFopIG1heFogPSB6O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3A6IFdvcmtlclJlc3BvbnNlID0ge1xuICAgICAgdHlwZTogJ2RvbmUnLFxuICAgICAgY29kZSxcbiAgICAgIG1lc2g6IHtcbiAgICAgICAgdGVycmFpbjogeyBwb3NCNjQ6IGZsb2F0MzJUb0I2NCh0ZXJyYWluLnBvc2l0aW9ucyksIG5vcm1CNjQ6IGZsb2F0MzJUb0I2NCh0ZXJyYWluLm5vcm1hbHMpLCBjb3VudDogdGVycmFpbi50cmlhbmdsZUNvdW50IH0sXG4gICAgICAgIHdhbGxzOiAgIHsgcG9zQjY0OiBmbG9hdDMyVG9CNjQod2FsbHMucG9zaXRpb25zKSwgICBub3JtQjY0OiBmbG9hdDMyVG9CNjQod2FsbHMubm9ybWFscyksICAgY291bnQ6IHdhbGxzLnRyaWFuZ2xlQ291bnQgfSxcbiAgICAgICAgYm90dG9tOiAgeyBwb3NCNjQ6IGZsb2F0MzJUb0I2NChib3R0b20ucG9zaXRpb25zKSwgIG5vcm1CNjQ6IGZsb2F0MzJUb0I2NChib3R0b20ubm9ybWFscyksICBjb3VudDogYm90dG9tLnRyaWFuZ2xlQ291bnQgfSxcbiAgICAgICAgdGV4dDogICAgdGV4dE1lc2ggPyB7IHBvc0I2NDogZmxvYXQzMlRvQjY0KHRleHRNZXNoLnBvc2l0aW9ucyksIG5vcm1CNjQ6IGZsb2F0MzJUb0I2NCh0ZXh0TWVzaC5ub3JtYWxzKSwgY291bnQ6IHRleHRNZXNoLnRyaWFuZ2xlQ291bnQgfSA6IG51bGwsXG4gICAgICAgIHdvcmxkQkJveDogeyBtaW5YLCBtYXhYLCBtaW5ZLCBtYXhZLCBtaW5aLCBtYXhaIH0sXG4gICAgICB9LFxuICAgICAgc3RsQmFzZTY0OiBidWZUb0I2NChzdGxCdWYpLFxuICAgIH07XG4gICAgc2VsZi5wb3N0TWVzc2FnZShyZXNwKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHNlbGYucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZXJyb3InLCBjb2RlLCBlcnJvck1lc3NhZ2U6IFN0cmluZyhlKSB9IHNhdGlzZmllcyBXb3JrZXJSZXNwb25zZSk7XG4gIH1cbn07XG4iXSwibmFtZXMiOlsiY2xpcERlbVRvUG9seWdvbiIsImJ1aWxkVGVycmFpbk1lc2giLCJidWlsZFNvbGlkTWVzaCIsImJ1aWxkVGV4dE1lc2giLCJzZXJpYWxpemVTdGwiLCJUT0tZT19QVVpaTEVfQkJPWCIsImI2NFRvRmxvYXQzMiIsImI2NCIsImJpbiIsImF0b2IiLCJidWYiLCJBcnJheUJ1ZmZlciIsImxlbmd0aCIsInU4IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiRmxvYXQzMkFycmF5IiwiZmxvYXQzMlRvQjY0IiwiYXJyIiwiYnVmZmVyIiwic3RyIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsImJ1ZlRvQjY0IiwicHJvZ3Jlc3MiLCJjb2RlIiwicGhhc2UiLCJwcm9nIiwic2VsZiIsInBvc3RNZXNzYWdlIiwidHlwZSIsImZlYXR1cmVUb1BvbHlnb25zIiwiZmVhdHVyZSIsImdlb20iLCJnZW9tZXRyeSIsInBvbHlnb25zIiwiYWRkUG9seWdvbiIsImNvb3JkcyIsInJpbmdzIiwibWFwIiwicmluZyIsImxvbiIsImxhdCIsIm91dGVyIiwic3VtTG9uIiwic3VtTGF0IiwiY0xvbiIsImNMYXQiLCJiIiwibWluTG9uIiwibWF4TG9uIiwibWluTGF0IiwibWF4TGF0IiwicHVzaCIsImNvb3JkaW5hdGVzIiwicG9seSIsIm9ubWVzc2FnZSIsImV2dCIsImJvdW5kYXJ5IiwiZGVtR3JpZCIsImRlbUdyaWRNc2ciLCJwYXJhbXMiLCJmb250QmFzZTY0IiwiZGF0YSIsImRlbVZhbHVlcyIsInZhbHVlc0Jhc2U2NCIsImJib3giLCJjb2xzIiwicm93cyIsInZhbHVlcyIsImNsaXBwZWQiLCJtZXNoIiwidGVycmFpbiIsImJhc2VaIiwid2FsbHMiLCJib3R0b20iLCJzdW1YIiwic3VtWSIsImNudCIsInBvc2l0aW9ucyIsImN4IiwiY3kiLCJmb250QnVmZmVyIiwiZnJvbSIsImMiLCJwcmVmTmFtZSIsInByb3BlcnRpZXMiLCJOMDNfMDAxIiwidGV4dE1lc2giLCJzb3VwcyIsInN0bEJ1ZiIsIm1pblgiLCJJbmZpbml0eSIsIm1heFgiLCJtaW5ZIiwibWF4WSIsIm1pbloiLCJtYXhaIiwicyIsIngiLCJ5IiwieiIsInJlc3AiLCJwb3NCNjQiLCJub3JtQjY0Iiwibm9ybWFscyIsImNvdW50IiwidHJpYW5nbGVDb3VudCIsInRleHQiLCJ3b3JsZEJCb3giLCJzdGxCYXNlNjQiLCJlIiwiZXJyb3JNZXNzYWdlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./workers/mesh.worker.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			var execOptions = { id: moduleId, module: module, factory: __webpack_modules__[moduleId], require: __webpack_require__ };
/******/ 			__webpack_require__.i.forEach(function(handler) { handler(execOptions); });
/******/ 			module = execOptions.module;
/******/ 			execOptions.factory.call(module.exports, module, module.exports, execOptions.require);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/******/ 	// expose the module execution interceptor
/******/ 	__webpack_require__.i = [];
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "static/chunks/" + chunkId + ".js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript update chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference all chunks
/******/ 		__webpack_require__.hu = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "static/webpack/" + chunkId + "." + __webpack_require__.h() + ".hot-update.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.miniCssF = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get update manifest filename */
/******/ 	!function() {
/******/ 		__webpack_require__.hmrF = function() { return "static/webpack/" + __webpack_require__.h() + ".e79e8674aa65e016.hot-update.json"; };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/getFullHash */
/******/ 	!function() {
/******/ 		__webpack_require__.h = function() { return "c7f95cdf16914249"; }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; },
/******/ 					createScriptURL: function(url) { return url; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script url */
/******/ 	!function() {
/******/ 		__webpack_require__.tu = function(url) { return __webpack_require__.tt().createScriptURL(url); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hot module replacement */
/******/ 	!function() {
/******/ 		var currentModuleData = {};
/******/ 		var installedModules = __webpack_require__.c;
/******/ 		
/******/ 		// module and require creation
/******/ 		var currentChildModule;
/******/ 		var currentParents = [];
/******/ 		
/******/ 		// status
/******/ 		var registeredStatusHandlers = [];
/******/ 		var currentStatus = "idle";
/******/ 		
/******/ 		// while downloading
/******/ 		var blockingPromises = 0;
/******/ 		var blockingPromisesWaiting = [];
/******/ 		
/******/ 		// The update info
/******/ 		var currentUpdateApplyHandlers;
/******/ 		var queuedInvalidatedModules;
/******/ 		
/******/ 		__webpack_require__.hmrD = currentModuleData;
/******/ 		
/******/ 		__webpack_require__.i.push(function (options) {
/******/ 			var module = options.module;
/******/ 			var require = createRequire(options.require, options.id);
/******/ 			module.hot = createModuleHotObject(options.id, module);
/******/ 			module.parents = currentParents;
/******/ 			module.children = [];
/******/ 			currentParents = [];
/******/ 			options.require = require;
/******/ 		});
/******/ 		
/******/ 		__webpack_require__.hmrC = {};
/******/ 		__webpack_require__.hmrI = {};
/******/ 		
/******/ 		function createRequire(require, moduleId) {
/******/ 			var me = installedModules[moduleId];
/******/ 			if (!me) return require;
/******/ 			var fn = function (request) {
/******/ 				if (me.hot.active) {
/******/ 					if (installedModules[request]) {
/******/ 						var parents = installedModules[request].parents;
/******/ 						if (parents.indexOf(moduleId) === -1) {
/******/ 							parents.push(moduleId);
/******/ 						}
/******/ 					} else {
/******/ 						currentParents = [moduleId];
/******/ 						currentChildModule = request;
/******/ 					}
/******/ 					if (me.children.indexOf(request) === -1) {
/******/ 						me.children.push(request);
/******/ 					}
/******/ 				} else {
/******/ 					console.warn(
/******/ 						"[HMR] unexpected require(" +
/******/ 							request +
/******/ 							") from disposed module " +
/******/ 							moduleId
/******/ 					);
/******/ 					currentParents = [];
/******/ 				}
/******/ 				return require(request);
/******/ 			};
/******/ 			var createPropertyDescriptor = function (name) {
/******/ 				return {
/******/ 					configurable: true,
/******/ 					enumerable: true,
/******/ 					get: function () {
/******/ 						return require[name];
/******/ 					},
/******/ 					set: function (value) {
/******/ 						require[name] = value;
/******/ 					}
/******/ 				};
/******/ 			};
/******/ 			for (var name in require) {
/******/ 				if (Object.prototype.hasOwnProperty.call(require, name) && name !== "e") {
/******/ 					Object.defineProperty(fn, name, createPropertyDescriptor(name));
/******/ 				}
/******/ 			}
/******/ 			fn.e = function (chunkId, fetchPriority) {
/******/ 				return trackBlockingPromise(require.e(chunkId, fetchPriority));
/******/ 			};
/******/ 			return fn;
/******/ 		}
/******/ 		
/******/ 		function createModuleHotObject(moduleId, me) {
/******/ 			var _main = currentChildModule !== moduleId;
/******/ 			var hot = {
/******/ 				// private stuff
/******/ 				_acceptedDependencies: {},
/******/ 				_acceptedErrorHandlers: {},
/******/ 				_declinedDependencies: {},
/******/ 				_selfAccepted: false,
/******/ 				_selfDeclined: false,
/******/ 				_selfInvalidated: false,
/******/ 				_disposeHandlers: [],
/******/ 				_main: _main,
/******/ 				_requireSelf: function () {
/******/ 					currentParents = me.parents.slice();
/******/ 					currentChildModule = _main ? undefined : moduleId;
/******/ 					__webpack_require__(moduleId);
/******/ 				},
/******/ 		
/******/ 				// Module API
/******/ 				active: true,
/******/ 				accept: function (dep, callback, errorHandler) {
/******/ 					if (dep === undefined) hot._selfAccepted = true;
/******/ 					else if (typeof dep === "function") hot._selfAccepted = dep;
/******/ 					else if (typeof dep === "object" && dep !== null) {
/******/ 						for (var i = 0; i < dep.length; i++) {
/******/ 							hot._acceptedDependencies[dep[i]] = callback || function () {};
/******/ 							hot._acceptedErrorHandlers[dep[i]] = errorHandler;
/******/ 						}
/******/ 					} else {
/******/ 						hot._acceptedDependencies[dep] = callback || function () {};
/******/ 						hot._acceptedErrorHandlers[dep] = errorHandler;
/******/ 					}
/******/ 				},
/******/ 				decline: function (dep) {
/******/ 					if (dep === undefined) hot._selfDeclined = true;
/******/ 					else if (typeof dep === "object" && dep !== null)
/******/ 						for (var i = 0; i < dep.length; i++)
/******/ 							hot._declinedDependencies[dep[i]] = true;
/******/ 					else hot._declinedDependencies[dep] = true;
/******/ 				},
/******/ 				dispose: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				addDisposeHandler: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				removeDisposeHandler: function (callback) {
/******/ 					var idx = hot._disposeHandlers.indexOf(callback);
/******/ 					if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 				},
/******/ 				invalidate: function () {
/******/ 					this._selfInvalidated = true;
/******/ 					switch (currentStatus) {
/******/ 						case "idle":
/******/ 							currentUpdateApplyHandlers = [];
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							setStatus("ready");
/******/ 							break;
/******/ 						case "ready":
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							break;
/******/ 						case "prepare":
/******/ 						case "check":
/******/ 						case "dispose":
/******/ 						case "apply":
/******/ 							(queuedInvalidatedModules = queuedInvalidatedModules || []).push(
/******/ 								moduleId
/******/ 							);
/******/ 							break;
/******/ 						default:
/******/ 							// ignore requests in error states
/******/ 							break;
/******/ 					}
/******/ 				},
/******/ 		
/******/ 				// Management API
/******/ 				check: hotCheck,
/******/ 				apply: hotApply,
/******/ 				status: function (l) {
/******/ 					if (!l) return currentStatus;
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				addStatusHandler: function (l) {
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				removeStatusHandler: function (l) {
/******/ 					var idx = registeredStatusHandlers.indexOf(l);
/******/ 					if (idx >= 0) registeredStatusHandlers.splice(idx, 1);
/******/ 				},
/******/ 		
/******/ 				//inherit from previous dispose call
/******/ 				data: currentModuleData[moduleId]
/******/ 			};
/******/ 			currentChildModule = undefined;
/******/ 			return hot;
/******/ 		}
/******/ 		
/******/ 		function setStatus(newStatus) {
/******/ 			currentStatus = newStatus;
/******/ 			var results = [];
/******/ 		
/******/ 			for (var i = 0; i < registeredStatusHandlers.length; i++)
/******/ 				results[i] = registeredStatusHandlers[i].call(null, newStatus);
/******/ 		
/******/ 			return Promise.all(results);
/******/ 		}
/******/ 		
/******/ 		function unblock() {
/******/ 			if (--blockingPromises === 0) {
/******/ 				setStatus("ready").then(function () {
/******/ 					if (blockingPromises === 0) {
/******/ 						var list = blockingPromisesWaiting;
/******/ 						blockingPromisesWaiting = [];
/******/ 						for (var i = 0; i < list.length; i++) {
/******/ 							list[i]();
/******/ 						}
/******/ 					}
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function trackBlockingPromise(promise) {
/******/ 			switch (currentStatus) {
/******/ 				case "ready":
/******/ 					setStatus("prepare");
/******/ 				/* fallthrough */
/******/ 				case "prepare":
/******/ 					blockingPromises++;
/******/ 					promise.then(unblock, unblock);
/******/ 					return promise;
/******/ 				default:
/******/ 					return promise;
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function waitForBlockingPromises(fn) {
/******/ 			if (blockingPromises === 0) return fn();
/******/ 			return new Promise(function (resolve) {
/******/ 				blockingPromisesWaiting.push(function () {
/******/ 					resolve(fn());
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function hotCheck(applyOnUpdate) {
/******/ 			if (currentStatus !== "idle") {
/******/ 				throw new Error("check() is only allowed in idle status");
/******/ 			}
/******/ 			return setStatus("check")
/******/ 				.then(__webpack_require__.hmrM)
/******/ 				.then(function (update) {
/******/ 					if (!update) {
/******/ 						return setStatus(applyInvalidatedModules() ? "ready" : "idle").then(
/******/ 							function () {
/******/ 								return null;
/******/ 							}
/******/ 						);
/******/ 					}
/******/ 		
/******/ 					return setStatus("prepare").then(function () {
/******/ 						var updatedModules = [];
/******/ 						currentUpdateApplyHandlers = [];
/******/ 		
/******/ 						return Promise.all(
/******/ 							Object.keys(__webpack_require__.hmrC).reduce(function (
/******/ 								promises,
/******/ 								key
/******/ 							) {
/******/ 								__webpack_require__.hmrC[key](
/******/ 									update.c,
/******/ 									update.r,
/******/ 									update.m,
/******/ 									promises,
/******/ 									currentUpdateApplyHandlers,
/******/ 									updatedModules
/******/ 								);
/******/ 								return promises;
/******/ 							}, [])
/******/ 						).then(function () {
/******/ 							return waitForBlockingPromises(function () {
/******/ 								if (applyOnUpdate) {
/******/ 									return internalApply(applyOnUpdate);
/******/ 								} else {
/******/ 									return setStatus("ready").then(function () {
/******/ 										return updatedModules;
/******/ 									});
/******/ 								}
/******/ 							});
/******/ 						});
/******/ 					});
/******/ 				});
/******/ 		}
/******/ 		
/******/ 		function hotApply(options) {
/******/ 			if (currentStatus !== "ready") {
/******/ 				return Promise.resolve().then(function () {
/******/ 					throw new Error(
/******/ 						"apply() is only allowed in ready status (state: " +
/******/ 							currentStatus +
/******/ 							")"
/******/ 					);
/******/ 				});
/******/ 			}
/******/ 			return internalApply(options);
/******/ 		}
/******/ 		
/******/ 		function internalApply(options) {
/******/ 			options = options || {};
/******/ 		
/******/ 			applyInvalidatedModules();
/******/ 		
/******/ 			var results = currentUpdateApplyHandlers.map(function (handler) {
/******/ 				return handler(options);
/******/ 			});
/******/ 			currentUpdateApplyHandlers = undefined;
/******/ 		
/******/ 			var errors = results
/******/ 				.map(function (r) {
/******/ 					return r.error;
/******/ 				})
/******/ 				.filter(Boolean);
/******/ 		
/******/ 			if (errors.length > 0) {
/******/ 				return setStatus("abort").then(function () {
/******/ 					throw errors[0];
/******/ 				});
/******/ 			}
/******/ 		
/******/ 			// Now in "dispose" phase
/******/ 			var disposePromise = setStatus("dispose");
/******/ 		
/******/ 			results.forEach(function (result) {
/******/ 				if (result.dispose) result.dispose();
/******/ 			});
/******/ 		
/******/ 			// Now in "apply" phase
/******/ 			var applyPromise = setStatus("apply");
/******/ 		
/******/ 			var error;
/******/ 			var reportError = function (err) {
/******/ 				if (!error) error = err;
/******/ 			};
/******/ 		
/******/ 			var outdatedModules = [];
/******/ 			results.forEach(function (result) {
/******/ 				if (result.apply) {
/******/ 					var modules = result.apply(reportError);
/******/ 					if (modules) {
/******/ 						for (var i = 0; i < modules.length; i++) {
/******/ 							outdatedModules.push(modules[i]);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			});
/******/ 		
/******/ 			return Promise.all([disposePromise, applyPromise]).then(function () {
/******/ 				// handle errors in accept handlers and self accepted module load
/******/ 				if (error) {
/******/ 					return setStatus("fail").then(function () {
/******/ 						throw error;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				if (queuedInvalidatedModules) {
/******/ 					return internalApply(options).then(function (list) {
/******/ 						outdatedModules.forEach(function (moduleId) {
/******/ 							if (list.indexOf(moduleId) < 0) list.push(moduleId);
/******/ 						});
/******/ 						return list;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				return setStatus("idle").then(function () {
/******/ 					return outdatedModules;
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function applyInvalidatedModules() {
/******/ 			if (queuedInvalidatedModules) {
/******/ 				if (!currentUpdateApplyHandlers) currentUpdateApplyHandlers = [];
/******/ 				Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 					queuedInvalidatedModules.forEach(function (moduleId) {
/******/ 						__webpack_require__.hmrI[key](
/******/ 							moduleId,
/******/ 							currentUpdateApplyHandlers
/******/ 						);
/******/ 					});
/******/ 				});
/******/ 				queuedInvalidatedModules = undefined;
/******/ 				return true;
/******/ 			}
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "/_next/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/******/ 	/* webpack/runtime/css loading */
/******/ 	!function() {
/******/ 		var createStylesheet = function(chunkId, fullhref, resolve, reject) {
/******/ 			var linkTag = document.createElement("link");
/******/ 		
/******/ 			linkTag.rel = "stylesheet";
/******/ 			linkTag.type = "text/css";
/******/ 			var onLinkComplete = function(event) {
/******/ 				// avoid mem leaks.
/******/ 				linkTag.onerror = linkTag.onload = null;
/******/ 				if (event.type === 'load') {
/******/ 					resolve();
/******/ 				} else {
/******/ 					var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 					var realHref = event && event.target && event.target.href || fullhref;
/******/ 					var err = new Error("Loading CSS chunk " + chunkId + " failed.\n(" + realHref + ")");
/******/ 					err.code = "CSS_CHUNK_LOAD_FAILED";
/******/ 					err.type = errorType;
/******/ 					err.request = realHref;
/******/ 					linkTag.parentNode.removeChild(linkTag)
/******/ 					reject(err);
/******/ 				}
/******/ 			}
/******/ 			linkTag.onerror = linkTag.onload = onLinkComplete;
/******/ 			linkTag.href = fullhref;
/******/ 		
/******/ 			document.head.appendChild(linkTag);
/******/ 			return linkTag;
/******/ 		};
/******/ 		var findStylesheet = function(href, fullhref) {
/******/ 			var existingLinkTags = document.getElementsByTagName("link");
/******/ 			for(var i = 0; i < existingLinkTags.length; i++) {
/******/ 				var tag = existingLinkTags[i];
/******/ 				var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
/******/ 				if(tag.rel === "stylesheet" && (dataHref === href || dataHref === fullhref)) return tag;
/******/ 			}
/******/ 			var existingStyleTags = document.getElementsByTagName("style");
/******/ 			for(var i = 0; i < existingStyleTags.length; i++) {
/******/ 				var tag = existingStyleTags[i];
/******/ 				var dataHref = tag.getAttribute("data-href");
/******/ 				if(dataHref === href || dataHref === fullhref) return tag;
/******/ 			}
/******/ 		};
/******/ 		var loadStylesheet = function(chunkId) {
/******/ 			return new Promise(function(resolve, reject) {
/******/ 				var href = __webpack_require__.miniCssF(chunkId);
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				if(findStylesheet(href, fullhref)) return resolve();
/******/ 				createStylesheet(chunkId, fullhref, resolve, reject);
/******/ 			});
/******/ 		}
/******/ 		// no chunk loading
/******/ 		
/******/ 		var oldTags = [];
/******/ 		var newTags = [];
/******/ 		var applyHandler = function(options) {
/******/ 			return { dispose: function() {
/******/ 				for(var i = 0; i < oldTags.length; i++) {
/******/ 					var oldTag = oldTags[i];
/******/ 					if(oldTag.parentNode) oldTag.parentNode.removeChild(oldTag);
/******/ 				}
/******/ 				oldTags.length = 0;
/******/ 			}, apply: function() {
/******/ 				for(var i = 0; i < newTags.length; i++) newTags[i].rel = "stylesheet";
/******/ 				newTags.length = 0;
/******/ 			} };
/******/ 		}
/******/ 		__webpack_require__.hmrC.miniCss = function(chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			chunkIds.forEach(function(chunkId) {
/******/ 				var href = __webpack_require__.miniCssF(chunkId);
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				var oldTag = findStylesheet(href, fullhref);
/******/ 				if(!oldTag) return;
/******/ 				promises.push(new Promise(function(resolve, reject) {
/******/ 					var tag = createStylesheet(chunkId, fullhref, function() {
/******/ 						tag.as = "style";
/******/ 						tag.rel = "preload";
/******/ 						resolve();
/******/ 					}, reject);
/******/ 					oldTags.push(oldTag);
/******/ 					newTags.push(tag);
/******/ 				}));
/******/ 			});
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	!function() {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = __webpack_require__.hmrS_importScripts = __webpack_require__.hmrS_importScripts || {
/******/ 			"_app-pages-browser_workers_mesh_worker_ts": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = function(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var runtime = data[2];
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = function(chunkId, promises) {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.tu(__webpack_require__.p + __webpack_require__.u(chunkId)));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		function loadUpdateChunk(chunkId, updatedModulesList) {
/******/ 			var success = false;
/******/ 			self["webpackHotUpdate_N_E"] = function(_, moreModules, runtime) {
/******/ 				for(var moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						currentUpdate[moduleId] = moreModules[moduleId];
/******/ 						if(updatedModulesList) updatedModulesList.push(moduleId);
/******/ 					}
/******/ 				}
/******/ 				if(runtime) currentUpdateRuntime.push(runtime);
/******/ 				success = true;
/******/ 			};
/******/ 			// start update chunk loading
/******/ 			importScripts(__webpack_require__.tu(__webpack_require__.p + __webpack_require__.hu(chunkId)));
/******/ 			if(!success) throw new Error("Loading update chunk failed for unknown reason");
/******/ 		}
/******/ 		
/******/ 		var currentUpdateChunks;
/******/ 		var currentUpdate;
/******/ 		var currentUpdateRemovedChunks;
/******/ 		var currentUpdateRuntime;
/******/ 		function applyHandler(options) {
/******/ 			if (__webpack_require__.f) delete __webpack_require__.f.importScriptsHmr;
/******/ 			currentUpdateChunks = undefined;
/******/ 			function getAffectedModuleEffects(updateModuleId) {
/******/ 				var outdatedModules = [updateModuleId];
/******/ 				var outdatedDependencies = {};
/******/ 		
/******/ 				var queue = outdatedModules.map(function (id) {
/******/ 					return {
/******/ 						chain: [id],
/******/ 						id: id
/******/ 					};
/******/ 				});
/******/ 				while (queue.length > 0) {
/******/ 					var queueItem = queue.pop();
/******/ 					var moduleId = queueItem.id;
/******/ 					var chain = queueItem.chain;
/******/ 					var module = __webpack_require__.c[moduleId];
/******/ 					if (
/******/ 						!module ||
/******/ 						(module.hot._selfAccepted && !module.hot._selfInvalidated)
/******/ 					)
/******/ 						continue;
/******/ 					if (module.hot._selfDeclined) {
/******/ 						return {
/******/ 							type: "self-declined",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					if (module.hot._main) {
/******/ 						return {
/******/ 							type: "unaccepted",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					for (var i = 0; i < module.parents.length; i++) {
/******/ 						var parentId = module.parents[i];
/******/ 						var parent = __webpack_require__.c[parentId];
/******/ 						if (!parent) continue;
/******/ 						if (parent.hot._declinedDependencies[moduleId]) {
/******/ 							return {
/******/ 								type: "declined",
/******/ 								chain: chain.concat([parentId]),
/******/ 								moduleId: moduleId,
/******/ 								parentId: parentId
/******/ 							};
/******/ 						}
/******/ 						if (outdatedModules.indexOf(parentId) !== -1) continue;
/******/ 						if (parent.hot._acceptedDependencies[moduleId]) {
/******/ 							if (!outdatedDependencies[parentId])
/******/ 								outdatedDependencies[parentId] = [];
/******/ 							addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 							continue;
/******/ 						}
/******/ 						delete outdatedDependencies[parentId];
/******/ 						outdatedModules.push(parentId);
/******/ 						queue.push({
/******/ 							chain: chain.concat([parentId]),
/******/ 							id: parentId
/******/ 						});
/******/ 					}
/******/ 				}
/******/ 		
/******/ 				return {
/******/ 					type: "accepted",
/******/ 					moduleId: updateModuleId,
/******/ 					outdatedModules: outdatedModules,
/******/ 					outdatedDependencies: outdatedDependencies
/******/ 				};
/******/ 			}
/******/ 		
/******/ 			function addAllToSet(a, b) {
/******/ 				for (var i = 0; i < b.length; i++) {
/******/ 					var item = b[i];
/******/ 					if (a.indexOf(item) === -1) a.push(item);
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// at begin all updates modules are outdated
/******/ 			// the "outdated" status can propagate to parents if they don't accept the children
/******/ 			var outdatedDependencies = {};
/******/ 			var outdatedModules = [];
/******/ 			var appliedUpdate = {};
/******/ 		
/******/ 			var warnUnexpectedRequire = function warnUnexpectedRequire(module) {
/******/ 				console.warn(
/******/ 					"[HMR] unexpected require(" + module.id + ") to disposed module"
/******/ 				);
/******/ 			};
/******/ 		
/******/ 			for (var moduleId in currentUpdate) {
/******/ 				if (__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 					var newModuleFactory = currentUpdate[moduleId];
/******/ 					/** @type {TODO} */
/******/ 					var result;
/******/ 					if (newModuleFactory) {
/******/ 						result = getAffectedModuleEffects(moduleId);
/******/ 					} else {
/******/ 						result = {
/******/ 							type: "disposed",
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					/** @type {Error|false} */
/******/ 					var abortError = false;
/******/ 					var doApply = false;
/******/ 					var doDispose = false;
/******/ 					var chainInfo = "";
/******/ 					if (result.chain) {
/******/ 						chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 					}
/******/ 					switch (result.type) {
/******/ 						case "self-declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of self decline: " +
/******/ 										result.moduleId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of declined dependency: " +
/******/ 										result.moduleId +
/******/ 										" in " +
/******/ 										result.parentId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "unaccepted":
/******/ 							if (options.onUnaccepted) options.onUnaccepted(result);
/******/ 							if (!options.ignoreUnaccepted)
/******/ 								abortError = new Error(
/******/ 									"Aborted because " + moduleId + " is not accepted" + chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "accepted":
/******/ 							if (options.onAccepted) options.onAccepted(result);
/******/ 							doApply = true;
/******/ 							break;
/******/ 						case "disposed":
/******/ 							if (options.onDisposed) options.onDisposed(result);
/******/ 							doDispose = true;
/******/ 							break;
/******/ 						default:
/******/ 							throw new Error("Unexception type " + result.type);
/******/ 					}
/******/ 					if (abortError) {
/******/ 						return {
/******/ 							error: abortError
/******/ 						};
/******/ 					}
/******/ 					if (doApply) {
/******/ 						appliedUpdate[moduleId] = newModuleFactory;
/******/ 						addAllToSet(outdatedModules, result.outdatedModules);
/******/ 						for (moduleId in result.outdatedDependencies) {
/******/ 							if (__webpack_require__.o(result.outdatedDependencies, moduleId)) {
/******/ 								if (!outdatedDependencies[moduleId])
/******/ 									outdatedDependencies[moduleId] = [];
/******/ 								addAllToSet(
/******/ 									outdatedDependencies[moduleId],
/******/ 									result.outdatedDependencies[moduleId]
/******/ 								);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 					if (doDispose) {
/******/ 						addAllToSet(outdatedModules, [result.moduleId]);
/******/ 						appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 			currentUpdate = undefined;
/******/ 		
/******/ 			// Store self accepted outdated modules to require them later by the module system
/******/ 			var outdatedSelfAcceptedModules = [];
/******/ 			for (var j = 0; j < outdatedModules.length; j++) {
/******/ 				var outdatedModuleId = outdatedModules[j];
/******/ 				var module = __webpack_require__.c[outdatedModuleId];
/******/ 				if (
/******/ 					module &&
/******/ 					(module.hot._selfAccepted || module.hot._main) &&
/******/ 					// removed self-accepted modules should not be required
/******/ 					appliedUpdate[outdatedModuleId] !== warnUnexpectedRequire &&
/******/ 					// when called invalidate self-accepting is not possible
/******/ 					!module.hot._selfInvalidated
/******/ 				) {
/******/ 					outdatedSelfAcceptedModules.push({
/******/ 						module: outdatedModuleId,
/******/ 						require: module.hot._requireSelf,
/******/ 						errorHandler: module.hot._selfAccepted
/******/ 					});
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			var moduleOutdatedDependencies;
/******/ 		
/******/ 			return {
/******/ 				dispose: function () {
/******/ 					currentUpdateRemovedChunks.forEach(function (chunkId) {
/******/ 						delete installedChunks[chunkId];
/******/ 					});
/******/ 					currentUpdateRemovedChunks = undefined;
/******/ 		
/******/ 					var idx;
/******/ 					var queue = outdatedModules.slice();
/******/ 					while (queue.length > 0) {
/******/ 						var moduleId = queue.pop();
/******/ 						var module = __webpack_require__.c[moduleId];
/******/ 						if (!module) continue;
/******/ 		
/******/ 						var data = {};
/******/ 		
/******/ 						// Call dispose handlers
/******/ 						var disposeHandlers = module.hot._disposeHandlers;
/******/ 						for (j = 0; j < disposeHandlers.length; j++) {
/******/ 							disposeHandlers[j].call(null, data);
/******/ 						}
/******/ 						__webpack_require__.hmrD[moduleId] = data;
/******/ 		
/******/ 						// disable module (this disables requires from this module)
/******/ 						module.hot.active = false;
/******/ 		
/******/ 						// remove module from cache
/******/ 						delete __webpack_require__.c[moduleId];
/******/ 		
/******/ 						// when disposing there is no need to call dispose handler
/******/ 						delete outdatedDependencies[moduleId];
/******/ 		
/******/ 						// remove "parents" references from all children
/******/ 						for (j = 0; j < module.children.length; j++) {
/******/ 							var child = __webpack_require__.c[module.children[j]];
/******/ 							if (!child) continue;
/******/ 							idx = child.parents.indexOf(moduleId);
/******/ 							if (idx >= 0) {
/******/ 								child.parents.splice(idx, 1);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// remove outdated dependency from module children
/******/ 					var dependency;
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								for (j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									dependency = moduleOutdatedDependencies[j];
/******/ 									idx = module.children.indexOf(dependency);
/******/ 									if (idx >= 0) module.children.splice(idx, 1);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 				},
/******/ 				apply: function (reportError) {
/******/ 					// insert new code
/******/ 					for (var updateModuleId in appliedUpdate) {
/******/ 						if (__webpack_require__.o(appliedUpdate, updateModuleId)) {
/******/ 							__webpack_require__.m[updateModuleId] = appliedUpdate[updateModuleId];
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// run new runtime modules
/******/ 					for (var i = 0; i < currentUpdateRuntime.length; i++) {
/******/ 						currentUpdateRuntime[i](__webpack_require__);
/******/ 					}
/******/ 		
/******/ 					// call accept handlers
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							var module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								var callbacks = [];
/******/ 								var errorHandlers = [];
/******/ 								var dependenciesForCallbacks = [];
/******/ 								for (var j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									var dependency = moduleOutdatedDependencies[j];
/******/ 									var acceptCallback =
/******/ 										module.hot._acceptedDependencies[dependency];
/******/ 									var errorHandler =
/******/ 										module.hot._acceptedErrorHandlers[dependency];
/******/ 									if (acceptCallback) {
/******/ 										if (callbacks.indexOf(acceptCallback) !== -1) continue;
/******/ 										callbacks.push(acceptCallback);
/******/ 										errorHandlers.push(errorHandler);
/******/ 										dependenciesForCallbacks.push(dependency);
/******/ 									}
/******/ 								}
/******/ 								for (var k = 0; k < callbacks.length; k++) {
/******/ 									try {
/******/ 										callbacks[k].call(null, moduleOutdatedDependencies);
/******/ 									} catch (err) {
/******/ 										if (typeof errorHandlers[k] === "function") {
/******/ 											try {
/******/ 												errorHandlers[k](err, {
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k]
/******/ 												});
/******/ 											} catch (err2) {
/******/ 												if (options.onErrored) {
/******/ 													options.onErrored({
/******/ 														type: "accept-error-handler-errored",
/******/ 														moduleId: outdatedModuleId,
/******/ 														dependencyId: dependenciesForCallbacks[k],
/******/ 														error: err2,
/******/ 														originalError: err
/******/ 													});
/******/ 												}
/******/ 												if (!options.ignoreErrored) {
/******/ 													reportError(err2);
/******/ 													reportError(err);
/******/ 												}
/******/ 											}
/******/ 										} else {
/******/ 											if (options.onErrored) {
/******/ 												options.onErrored({
/******/ 													type: "accept-errored",
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k],
/******/ 													error: err
/******/ 												});
/******/ 											}
/******/ 											if (!options.ignoreErrored) {
/******/ 												reportError(err);
/******/ 											}
/******/ 										}
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// Load self accepted modules
/******/ 					for (var o = 0; o < outdatedSelfAcceptedModules.length; o++) {
/******/ 						var item = outdatedSelfAcceptedModules[o];
/******/ 						var moduleId = item.module;
/******/ 						try {
/******/ 							item.require(moduleId);
/******/ 						} catch (err) {
/******/ 							if (typeof item.errorHandler === "function") {
/******/ 								try {
/******/ 									item.errorHandler(err, {
/******/ 										moduleId: moduleId,
/******/ 										module: __webpack_require__.c[moduleId]
/******/ 									});
/******/ 								} catch (err2) {
/******/ 									if (options.onErrored) {
/******/ 										options.onErrored({
/******/ 											type: "self-accept-error-handler-errored",
/******/ 											moduleId: moduleId,
/******/ 											error: err2,
/******/ 											originalError: err
/******/ 										});
/******/ 									}
/******/ 									if (!options.ignoreErrored) {
/******/ 										reportError(err2);
/******/ 										reportError(err);
/******/ 									}
/******/ 								}
/******/ 							} else {
/******/ 								if (options.onErrored) {
/******/ 									options.onErrored({
/******/ 										type: "self-accept-errored",
/******/ 										moduleId: moduleId,
/******/ 										error: err
/******/ 									});
/******/ 								}
/******/ 								if (!options.ignoreErrored) {
/******/ 									reportError(err);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					return outdatedModules;
/******/ 				}
/******/ 			};
/******/ 		}
/******/ 		__webpack_require__.hmrI.importScripts = function (moduleId, applyHandlers) {
/******/ 			if (!currentUpdate) {
/******/ 				currentUpdate = {};
/******/ 				currentUpdateRuntime = [];
/******/ 				currentUpdateRemovedChunks = [];
/******/ 				applyHandlers.push(applyHandler);
/******/ 			}
/******/ 			if (!__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 				currentUpdate[moduleId] = __webpack_require__.m[moduleId];
/******/ 			}
/******/ 		};
/******/ 		__webpack_require__.hmrC.importScripts = function (
/******/ 			chunkIds,
/******/ 			removedChunks,
/******/ 			removedModules,
/******/ 			promises,
/******/ 			applyHandlers,
/******/ 			updatedModulesList
/******/ 		) {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			currentUpdateChunks = {};
/******/ 			currentUpdateRemovedChunks = removedChunks;
/******/ 			currentUpdate = removedModules.reduce(function (obj, key) {
/******/ 				obj[key] = false;
/******/ 				return obj;
/******/ 			}, {});
/******/ 			currentUpdateRuntime = [];
/******/ 			chunkIds.forEach(function (chunkId) {
/******/ 				if (
/******/ 					__webpack_require__.o(installedChunks, chunkId) &&
/******/ 					installedChunks[chunkId] !== undefined
/******/ 				) {
/******/ 					promises.push(loadUpdateChunk(chunkId, updatedModulesList));
/******/ 					currentUpdateChunks[chunkId] = true;
/******/ 				} else {
/******/ 					currentUpdateChunks[chunkId] = false;
/******/ 				}
/******/ 			});
/******/ 			if (__webpack_require__.f) {
/******/ 				__webpack_require__.f.importScriptsHmr = function (chunkId, promises) {
/******/ 					if (
/******/ 						currentUpdateChunks &&
/******/ 						__webpack_require__.o(currentUpdateChunks, chunkId) &&
/******/ 						!currentUpdateChunks[chunkId]
/******/ 					) {
/******/ 						promises.push(loadUpdateChunk(chunkId));
/******/ 						currentUpdateChunks[chunkId] = true;
/******/ 					}
/******/ 				};
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.hmrM = function() {
/******/ 			if (typeof fetch === "undefined") throw new Error("No browser support: need fetch API");
/******/ 			return fetch(__webpack_require__.p + __webpack_require__.hmrF()).then(function(response) {
/******/ 				if(response.status === 404) return; // no update available
/******/ 				if(!response.ok) throw new Error("Failed to fetch update manifest " + response.statusText);
/******/ 				return response.json();
/******/ 			});
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__("(app-pages-browser)/./workers/mesh.worker.ts");
/******/ 	_N_E = __webpack_exports__;
/******/ 	
/******/ })()
;