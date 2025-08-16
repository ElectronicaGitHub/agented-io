"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EAgentResponseType = exports.EAgentType = void 0;
var EAgentType;
(function (EAgentType) {
    EAgentType["MAIN"] = "main";
    EAgentType["PERMANENT"] = "permanent";
    EAgentType["WORKER"] = "worker";
    EAgentType["REFLECTION"] = "reflection";
})(EAgentType || (exports.EAgentType = EAgentType = {}));
var EAgentResponseType;
(function (EAgentResponseType) {
    EAgentResponseType["FUNCTION"] = "function";
    EAgentResponseType["TEXT"] = "text";
    EAgentResponseType["AGENT"] = "agent";
    EAgentResponseType["COMMAND"] = "command";
    EAgentResponseType["MULTIPLE_FUNCTIONS"] = "multiple_functions";
})(EAgentResponseType || (exports.EAgentResponseType = EAgentResponseType = {}));
