"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EAgentEvent = void 0;
var EAgentEvent;
(function (EAgentEvent) {
    EAgentEvent["MAIN_RESPONSE"] = "main_response";
    EAgentEvent["RESPONSE"] = "response";
    EAgentEvent["REFLECTION_RESPONSE"] = "reflection_response";
    EAgentEvent["MESSAGES_UPDATED"] = "messages_updated";
    EAgentEvent["MESSAGES_MAP_UPDATED_FULL"] = "messages_map_updated_full";
    EAgentEvent["STATUS_CHANGED"] = "status_changed";
    EAgentEvent["PING"] = "ping";
    EAgentEvent["PONG"] = "pong";
    EAgentEvent["REQUEST_LAST_RESPONSE"] = "request_last_response";
})(EAgentEvent || (exports.EAgentEvent = EAgentEvent = {}));
