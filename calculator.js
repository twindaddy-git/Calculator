/**
 * Ein Taschenrechner als kleine Fingerübung mit Javascript
 * @author Markus Steffl
 * @version 0.1
 */

const DEBUG_MODE = true;
const SHOW_DEBUG = false;
const LOG_ID = "log";

/**
 * Ein Opertator mit dieser Precedence wird immer sofort
 * auf das aktuelle Register angewendet. Er kann daher
 * auch nicht mehr als einen Opranden haben.
 */
const IMMEDIATE = 4;

/**
 * Ein Operator
 * @class
 */
class CalcOperator {
    
    constructor(id, count, precedence, symbol, action) {
        this.id = id;
        this.count = count;
        this.precedence = precedence;
        this.symbol = symbol;
        this.action = action;
    }

    toString() {
        return this.symbol;
    }
}

/**
 * Operatoren
 * 
 * @property {CalcOperator} add    - Addition
 * @property {CalcOperator} sub    - Subtraktion
 * @property {CalcOperator} mul    - Multiplikation
 * @property {CalcOperator} div    - Division
 * @property {CalcOperator} rep    - 1/x
 * @property {CalcOperator} sqr    - x^2
 * @property {CalcOperator} sqt    - sqrt(x)
 * @property {CalcOperator} neg    - *(-1)
*/
 const ops = {
    nop: new CalcOperator (0, 1, 0, "@", function (o1) { return o1; }),
    add: new CalcOperator (1, 2, 1, "+", function (o1, o2) { return o1 + o2; }),
    sub: new CalcOperator (2, 2, 1, "-", function (o1, o2) { return o1 - o2; }),
    mul: new CalcOperator (3, 2, 2, "*", function (o1, o2) { return o1 * o2; }),
    div: new CalcOperator (4, 2, 2, "&#xF7;", function (o1, o2) { return o1 / o2; }),
    rep: new CalcOperator (5, 1, IMMEDIATE, "1/x", function (o1) { return 1 / o1; }),
    sqr: new CalcOperator (6, 1, IMMEDIATE, "x<sup>2</sup>", function (o1) { return o1 * o1; }),
    sqt: new CalcOperator (7, 1, IMMEDIATE, "&#x221A;", function (o1) { return Math.sqrt(o1); }),
    neg: new CalcOperator (8, 1, IMMEDIATE, "+/-", function (o1) { return -o1; }),
    equ: new CalcOperator (99, 1, IMMEDIATE, "=", function (o1) { return -o1; })
}

/** 
 * Aufzählung der von Tasten ausgelöste Aktionen
 * 
 * @property {number} c       - Rücksetzen auf den Grundzustand
 * @property {number} ce      - Löschen der aktuell eingegeben Zahl
 * @property {number} bsp     - Löschen der letzten Ziffer
 * @property {number} equ     - Berechnung abschließen (=)
 */
const actionKeys = {
    c:   9,
    ce:  10,
    bsp: 11
}

/**
 * Ein Logger zum Debuggen. Die Console kann aber eigentlich mehr.
 * Wenn showDebug == false ist, werden die Ausgaben auch zur Console
 * delegiert
 * @classs
 */
class DebugLog {
    constructor() {
    }

    makeLogArea(elementID) {
        return ("<table style=\"width: 100%;\"><colgroup><col style=\"width: 200px;\"><col style=\"width: 60%;\"></colgroup>" + 
                         "<tbody><tr><td width=\"50%\">" + document.getElementById(elementID).innerHTML + "</td><td valign=\"top\" id=\"" 
                         + LOG_ID + "\" class=\"log\">Logging:\n\n</td></tr></tbody></table>");
    }

    /**
     * Gibe eine variable Anzhal von Argumenten im Log-Bereich
     * der Seite oder auf der Console aus. Der Nachteil dieses
     * zentralen Ansatzes ist, dass der Quellverweis in der 
     * Console im auf diese Methode verweist ...
     */
    log() {
        if (DEBUG_MODE) {
            let indent = "";
            for (let arg of arguments) {
                if (SHOW_DEBUG) {
                    if (typeof arg === 'object') {
                        document.getElementById(LOG_ID).textContent += indent + JSON.stringify(arg) + "\n";
                    } else {
                        document.getElementById(LOG_ID).textContent += indent + arg + "\n";
                    }    
                    if (indent.length == 0) {
                        indent = "> ";
                    }
                } else {
                    if (indent.length == 0) {
                        console.log(arg);
                        indent = "> ";
                    } else {
                        console.log(indent, arg);
                    }
                }
            }
        }
    }
}

/**
 * Ein Stack (eigentlich ein Array mit Convenience-Methoden)
 * @class
 */
class CalculatorStack {

    /**
     * Initialisiert das CalculatorStack-Objekt
     * @constructor
     */
    constructor() {
        this._items = [];
    }

    push() {
        for (let item of arguments) {
            this._items.push(item);
        }
    }

    pop() {
        return this._items.pop();
    }

    peek() {
        if (this._items.length > 0) {
            return this._items[this._items.length - 1];
        } else {
            return null;
        }
    }

    get length() {
        return this._items.length;
    }

    clear() {
        this._items = [];
    }

    /**
     * Gibt den innerHtml-String des Stacks für das StackDisplay zurück
     * Die einzelnen Stackelemente werden in <span>-Tags eingeschlossen.
     */
    displayHtml() {
        // Für eine Fingerübung machen wir uns jetzt keine Gedanken darum,
        // was wir machen, wenn der Stack für eine Visualisierung zu groß,
        // wird, wie wir überhaupt bisehr Überläufe und Fehler geflissentlich 
        // ignoriert haben.
        if (this.length > 0) {
            return "<span>" + this._items.join("</span><span>") + "</span>";
        } else {
            return "";
        }
    }
}

/**
 * Repräsentiert das aktuell in der Eingabe befindliche Register
 * @class
 */
class CalculatorDisplay {

    /**
     * Initialisiert das Display-Objekt
     * @constructor
     */
    constructor () {
        this._element = document.getElementById("display");
        this.clear();
    }

    /**
     * Der String im Display
     * @property {string} text
     */
    set text(text) {
        // safe
        document.getElementById("display").textContent = text;
        // unsafe cached
        // this._element.textContent = text;
    }
    get text() {
        // safe
        return document.getElementById("display").textContent;
        // unsafe cached
        // return this._element.textContent;
    }

    /**
     * Der Zahlenwert im Display
     * @property {number} value
     */
    get value() {
        return this._value;
    }
    set value(x) {
        this._value = x;
        this.text = String(x);
        // this._first = (x == 0);
    }

    /**
     * Initialisiert das Display
     */
    clear() {
        this.text = "0";
        this._first = true;
        this._value = 0.0;
    }

    restart() {
        this._first = true;
    }

    changed() {
        return !this._first;
    }
    /**
     * Schiebt einen neuen Tastenwert in das Display
     * @param {string} digit 
     */
    push(digit) {
        if (this._first) {
            this.text = digit;
            this._first = false;
        } else {
            if ((digit === ".") && this.hasPoint()) {
                // Wenn schon ein Dezimalpunkt im String ist, 
                // wollen wir keinen zweiten.
                return;
            }
            this.text += digit;
        }
        this._value = Number.parseFloat(this.text);
    }

    hasPoint() {
        return this.text.indexOf(".") >= 0;
    }

    /**
     * Löscht die letze eingegebene Ziffer
     */
    popLast() {
        if (! this._first) {
            if (this.text.length > 1) {
                this.text = this.text.substring(0, this.text.length - 1);
                this._value = Number.parseFloat(this.text);
            } else if (this.text.length == 1) {
                this.text = "0";
                this._first = true;
                this._value = 0.0;
            }    
        }
    }
}

/**
 * Repräsentiert die Displayzeile für den Stack unter dem Register
 * @class
 */
class StackDisplay  {
    
    constructor() {
        // Noch sehe ich keine notwendige Initialisierung
    }

    set html(s) {
        document.getElementById("opdisplay").innerHTML = s;
    }
    get html() {
        return document.getElementById("opdisplay").innerHTML;
    }

    clear() {
        document.getElementById("opdisplay").innerHTML = "";
    }

    display(stack) {
        this.html = stack.displayHtml();
    }
}

/**
 * Das "Ding, das eigentlich tut". Hier werden die Operationen
 * durchgeführt
 * @class
 */
class CalculatorEngine {

    constructor() {
        /**
         * Das CalculatorDisplay Objekt
         */
        this._display = new CalculatorDisplay();
        /**
         * Das StackDisplay Objekt
         */
        this._stackDisplay = new StackDisplay();
        /**
         * Der Stack für die Register / Werte
         */
        this._stack = new CalculatorStack();
        this._braceLevel = 0;
    }

    get display() {
        return this._display;
    }
    get stackDisplay() {
        return this._stackDisplay;
    }

    clear() {
        this._display.clear();
        this._stackDisplay.clear();
        this._stack.clear();
    }

    operate(operator) {
        // if (operator.symbol == "=" ) {
        if (Object.is(operator, ops.equ)) {
                // "Gleich" wurde gedrückt. Jetzt muss der ganze Stack
            // abgearbeitet werden.
            let value = this.display.value;
            if (this._stack.length > 0) {
                if (!this.display.changed()) {
                    this._stack.length.pop();
                    value = this._stack.pop();
                }
                while (this._stack.length > 0) {
                    value = this._stack.pop().action(this._stack.pop(), value);
                }
                this.display.value = value;
                this.display.restart();
            }
        } else if ((operator.precedence % 10) == IMMEDIATE || operator.count == 1) {
            // Wenn der aktuelle unäre Operator sofort auf dem Register
            // ausgeführt werden soll. Wir nutzen nur die vordere Stelle
            // der precedence, weil wir später die Klammern mit einem
            // einfachen precendence offset implementieren wollen. 
            if (!Object.is(operator, ops.neg) || this.display.changed()) {
                this._display.value = operator.action(this._display.value);
                if ((this._stack.length > 0) && !this.display.changed()) {
                    // Wenn auf dem Stack noch ein Operator liegt, und der aktuelle
                    // Registerinhalt noch aus der letzten Eingabe stammt, dann
                    // dann entfernen wir den letzten Operator und den Wert
                    // vom Stack.
                    this._stack.pop();
                    this._stack.pop();
                } 
    
            }
        } else {
            // Wenn der Stack aktuell leer ist
            if (this._stack.length == 0) {
                // Wir legen aktuellen Wert und Operator auf den Stack
                this._stack.push(this.display.value, operator);
            } else {
                // Wenn seit dem letzten Operator noch nichts geändert wurde
                if (!this.display.changed()) {
                    // dann tauschen wir einfach den Operator auf dem Stack
                    this._stack.pop();
                    this._stack.push(operator);
                } else {
                    // Letzen Operator vom Stack holen und precedence mit dem
                    // aktuellen Operator vergleichen
                    let prev = this._stack.pop();
                    if (operator.precedence > prev.precedence) {
                        // Der Operator auf dem Stack kann noch nicht ausgeführt
                        // werden, da der aktuelle Vorrang hat.
                        this._stack.push(prev, this.display.value, operator);
                    } else {
                        // Der aktuelle Operator ist denen auf dem Stack nachrangig. 
                        // Jetzt kann der Stack abgearbeitet werden.
                        let op2 = this.display.value;
                        this._stack.push(prev);
                        while(this._stack.length > 0 && 
                              operator.precedence <= this._stack.peek().precedence) {
                            prev = this._stack.pop();
                            op2 = prev.action(this._stack.pop(), op2);
                        }
                        this.display.value = op2;
                        this._stack.push(op2, operator);
                    }    
                }
            }
            // Nach einem Operator beginnt die Eingabe von neuem.
            this.display.restart();
        }
        this.stackDisplay.display(this._stack);
    }
}

/**
 * Der Taschenrecher
 * @type {CalculatorEngine}
 */
let engine;

/**
 * Ein Logger zum Debuggen. Die Console kann aber eigentlich mehr.
 * @type {DebugLog}
 */
let logger;

/**
 * Ein Array mit Funktionsaufrufen für keydown-Events
 * @type {DebugLog}
 */
let keyMap = [];

/**
 * EventHandler für body.onload
 * Initialisiert den Taschenrechner
 */
function onInit() {
    logger = new DebugLog();
    engine = new CalculatorEngine();

    if (DEBUG_MODE && SHOW_DEBUG) {
        document.getElementById("calculatorPage").innerHTML = logger.makeLogArea("calculatorPage");
    }
    document.addEventListener("keydown", onKeyDown);
    registerKey("+", onOp, ops.add);
    registerKey("-", onOp, ops.sub);
    registerKey("*", onOp, ops.mul);
    registerKey("/", onOp, ops.div);
    registerKey("Enter", onOp, ops.equ);
    registerKey(".", onDigit, ".");
    registerKey(",", onDigit, ".");
    registerKey("Backspace", onAction, actionKeys.bsp);
}

/**
 * Eventhandler für die Betätigung einer Zahlentaste
 * @param {Object} key - Das geklickte DOM-Element der Taste
 */
function onDigit(key) {
    if (typeof key === "string") {
        engine.display.push(key);    
    } else {
        engine.display.push(key.textContent);
    }
}

/**
 * Eventhandler für die Betätigung einer Operatortaste
 * @param {number} operator - Die Id der Operation
 */
function onOp(operator) {
    engine.operate(operator);
}

/**
 * Eventhandler für die Betätigung einer Aktionstaste
 * @param {number} actionKey - Die Id der Operation
 */
function onAction (actionKey) {
    // console.log ("Action: " + actionKey);
    switch (actionKey) {
        case actionKeys.ce:
            engine.display.clear();
            break;
        case actionKeys.c:
            engine.clear();
            break;
        case actionKeys.bsp:
            engine.display.popLast();
            break;
        default:
            logger.log("Unbekannte Taste");
    }
}

function registerKey (keyCode, handler, arg) {
    keyMap[keyCode] = {handler, arg};
}

/**
 * @todo: Einen Eventhandler für die Tastatur schreiben.
 * Eventhandler für Tastatur
 * @param {Event} ev - Das übergbene Event.
 */
function onKeyDown(ev) {
    if (ev.key >= "0" && ev.key <="9") {
        onDigit(ev.key);
    } else {
        if (ev.key in keyMap) {
            key = keyMap[ev.key];
            key.handler(key.arg);
        }
    }
}
