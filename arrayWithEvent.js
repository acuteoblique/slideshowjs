var ArrayWithEvent = (function () {
    var arrayCtor = ([]).constructor;

    var ArrayWithEvent = function () {
        var eventTarget,
            that = Array.of.apply(null, arguments),
            propertyName,
            functionsThatDontChangeThis = ["concat", "slice", "filter", "map", "copyWithin"],
            functionsThatChangeThis = ["fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

        function createWrapper(that, functionName, changed) {
            return function () {
                var result = Array.prototype[functionName].apply(that, arguments);
                if (changed) {
                    eventTarget.dispatchChangeEvent(that);
                }
                return (typeof result === "object" && result.constructor === arrayCtor) ? ArrayWithEvent.apply(null, result) : result;
            };
        }

        functionsThatChangeThis.forEach(function (propertyName) {
            that[propertyName] = createWrapper(that, propertyName, true);
        });
        functionsThatDontChangeThis.forEach(function (propertyName) {
            that[propertyName] = createWrapper(that, propertyName, false);
        });

        eventTarget = new EventTarget(that, ["change"]);

        return that;
    };

    return ArrayWithEvent;
})();
