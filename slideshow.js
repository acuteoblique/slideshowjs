if (typeof window.slideshowJs !== "undefined") {
    window.slideshowJs.toggle();
}
else {
    (function slideshowGlobal() {
        "use strict";
        function uriToBlobAndNameAsync(uri) {
            return {
                blob: null,
                name: ""
            };
        }

        function downloadUrisAsZipAsync(uris) {
        }

        function KeyHandler(element) {
            var eventTarget = new EventTarget(this, ["left", "right", "enter", "escape", "space"]);
            element.addEventListener("keypress", function (e) {
                switch (e.keyCode) {
                case 32:
                    eventTarget.dispatchSpaceEvent(e);
                    break;
                case 13:
                    eventTarget.dispatchEnterEvent(e);
                    break;
                case 27:
                    eventTarget.dispatchEscapeEvent(e);
                    break;
                }
            });
            element.addEventListener("keydown", function (e) {
                switch (e.keyCode) {
                case 37:
                    eventTarget.dispatchLeftEvent(e);
                    break;
                case 39:
                    eventTarget.dispatchRightEvent(e);
                    break;
                }
            });
        }

        function Timer(timeInMilliseconds, autoStart) {
            var eventTarget = new EventTarget(this, ["timer"]),
                id = 0,
                timeoutHandle;

            function timer(expectedId) {
                if (timeoutHandle && expectedId === id) {
                    eventTarget.dispatchTimerEvent();
                    timeoutHandle = setTimeout(timer.bind(this, ++id), timeInMilliseconds);
                }
            }

            function stop() {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }
            }
            this.stop = stop;

            function play() {
                if (!timeoutHandle) {
                    timeoutHandle = setTimeout(timer.bind(this, ++id), timeInMilliseconds);
                }
            }
            this.play = play;

            function toggle() {
                if (!timeoutHandle) {
                    play();
                }
                else {
                    stop();
                }
            }
            this.toggle = toggle;

            function reset() {
                if (timeoutHandle) {
                    stop();
                    play();
                }
            }
            this.reset = reset;

            function isPlaying() {
                return !!timeoutHandle;
            }
            this.isPlaying = isPlaying;

            if (autoStart) {
                play();
            }
        }

        function DocumentImageList() {
            var maxPages = 20,
                pages = 0,
                entries = new ArrayWithEvent();

            function getPathFromUri(uri) {
                var result = /[^:]+:\/\/[^/]+(\/[^?#]+)/.exec(uri);
                return result && result[1];
            }

            function elementToEntry(originalElement) {
                var fullUri = originalElement.parentElement.getAttribute("data-super-full-img") || originalElement.parentElement.href;
                return {
                    thumbnail: originalElement.src,
                    thumbnailImg: originalElement,
                    full: fullUri
                };
            }
    
            function entryFilter(pair) {
                try {
                    var fullPath = getPathFromUri(pair.full),
                        thumbnailPath = getPathFromUri(pair.thumbnail),
                        pathMatches = fullPath && fullPath === thumbnailPath;
                        
                    return pair.thumbnail && pair.full && pathMatches;
                }
                catch (e) { 
                    console.error("Error filtering: " + e);
                    return false;
                }
            }
    
            function entryToFullImageElement(entry) {
                var full = document.createElement("img"),
                    fullUri = entry.full;
    
                full.onerror = function(e) {
                    var newIdx = entries.indexOf(entry);
                    if (newIdx !== -1) {
                        entries.splice(newIdx, 1);
                    }
                };
                entry.fullImg = full;
                entry.ensureFullImg = function () {
                    full.src = fullUri;
                };
                return entry;
            }
    
            function processDocument(document) {
                if (pages++ > maxPages) { return; }
                console.log("Before processing document: " + entries.length);
                var anyEntries = !!entries.length;
                entries.splice.apply(entries, [entries.length - 1, 0].concat(Array.from(document.querySelectorAll("a > img")).
                    map(elementToEntry).filter(entryFilter).map(entryToFullImageElement)));
                    
                console.log("After processing document: " + entries.length);
                var nexts = Array.from(document.querySelectorAll("a")).filter(function(a) { return a.textContent.toLowerCase().trim() === "next"; });
                if (nexts && nexts.length) {
                    setTimeout(function() {
                        console.log("Found " + nexts.length + " possible nexts. Using " + nexts[nexts.length - 1].href);
                        var iframe = document.createElement("iframe");
                        iframe.src = nexts[nexts.length - 1].href;
                        iframe.style.display = "none";

                        iframe.onload = function() { processDocument(iframe.contentDocument); }
                        iframe.onerror = function() { console.error("Error attempting to read next: " + iframe.src); }
                        document.body.appendChild(iframe); // Must be appended to document to actually load.
                    }, 10000);
                }
            }
    
            this.processDocument = processDocument;
            this.entries = entries;
        }

        function SlideshowJs(documentImageList) {
            var viewerStyle = "display: none; align-items: center; justify-content: center; flex-wrap: nowrap; flex-direction: column; top: 0%; width: 100%; height: 100%; position: fixed; z-index: 1000; background-color: rgba(0, 0, 0, 0.75);",
                almostFillStyle = "top: 0%; width: 100%; height: 100%; position: fixed;",
                imageFillStyle = "max-width:100%; max-height:100%; width:auto; height:auto;",
                bgImageFillStyle = "position: fixed; left: 0px; top: 0px; opacity: 0;",
                controlStyle = "display: block; justify-content: center; flex-wrap: nowrap; flex-direction: row; font-size: 400%; color: black; opacity: 0.5; text-shadow: 1px 1px white, -1px -1px #444; top: 0%; left: 0%; position: fixed; z-index: 1001;",
                viewer = document.createElement("div"),
                effective = document.createElement("div"),
                controls = document.createElement("div"),
                prev = document.createElement("span"),
                playPause = document.createElement("span"),
                download = document.createElement("span"),
                position = document.createElement("span"),
                close = document.createElement("span"),
                next = document.createElement("span"),
                timer = new Timer(5000),
                keyHandler = new KeyHandler(document.body.parentNode),
                currentIdx = 0;
    
            function removeCurrent() {
                var target = documentImageList.entries[currentIdx].fullImg;
                if (target && target.parentElement) {
                    target.parentElement.removeChild(target);
                }
            }
    
            function updateFromIdx() {
                if (currentIdx < 0) {
                    currentIdx = documentImageList.entries.length + currentIdx;
                }
                if (documentImageList.entries.length === 0) {
                    currentIdx = 0;
                }
                else {
                    currentIdx = currentIdx % documentImageList.entries.length;
                }
                if (documentImageList.entries && documentImageList.entries.length) {
                    documentImageList.entries[currentIdx].ensureFullImg();
                    documentImageList.entries[currentIdx].fullImg.setAttribute("style", imageFillStyle);
                    effective.appendChild(documentImageList.entries[currentIdx].fullImg);

                    if (currentIdx + 1 < documentImageList.entries.length) {
                        documentImageList.entries[currentIdx + 1].ensureFullImg();
                        documentImageList.entries[currentIdx + 1].fullImg.setAttribute("style", bgImageFillStyle);
                        effective.appendChild(documentImageList.entries[currentIdx + 1].fullImg);
                    }
                }
                else {
                    console.log("Empty entries.");
                }

                position.textContent = (currentIdx + 1) + " of " + documentImageList.entries.length;
            }
    
            function toggle() {
                var viewerVisible = viewer.style.display !== "none";
                viewer.style.display = viewerVisible ? "none" : "block";
            }
            
            prev.textContent = "< ";
            keyHandler.onleft = prev.onclick = function prevHandler() { 
                timer.reset();
                removeCurrent();
                --currentIdx;
                updateFromIdx();
            };
            controls.appendChild(prev);

            download.textContent = "\u25BC";
            download.onclick = function downloadHandler() {
                function entryToFullUri(entry) { return entry.full; }
                function filterEntry(entry) { return entry && entry.full; }
                downloadUrisAsZipAsync(entries.filter(filterEntry).map(entryToFullUri));
            };
            controls.appendChild(download);

            playPause.textContent = "\u25B6";
            keyHandler.onspace = playPause.onclick = function playPauseHandler() {
                timer.toggle();
                playPause.textContent = timer.isPlaying() ? "\u25A0" : "\u25B6";
            };
            controls.appendChild(playPause);

            controls.appendChild(position);
            
            close.textContent = " X";
            keyHandler.onescape = close.onclick = function closeHandler() { 
                timer.stop();
                viewer.style.display = "none"; 
            };
            controls.appendChild(close);
            
            next.textContent = " >";
            keyHandler.onright = timer.ontimer = effective.onclick = next.onclick = function nextHandler() { 
                timer.reset();
                removeCurrent();
                ++currentIdx;
                updateFromIdx();
            };
            // Just use clicking on image to go next.
            // controls.appendChild(next);
            
            controls.setAttribute("style", controlStyle);
            viewer.appendChild(controls);
            
            effective.setAttribute("style", almostFillStyle);
            viewer.appendChild(effective);
            updateFromIdx();
            
            viewer.setAttribute("style", viewerStyle);
            document.body.appendChild(viewer);

            documentImageList.entries.addEventListener("change", function () {
                removeCurrent();
                updateFromIdx();
            });
            
            return {
                toggle: toggle
            };
        }

        function getLastScriptUri() {
            var scripts = document.querySelectorAll("script"),
                lastScriptUri,
                idx;

            for (idx = scripts.length; idx > 0 && !lastScriptUri; --idx) {
                if (scripts[idx - 1].src.length > 0) {
                    lastScriptUri = scripts[idx - 1].src;
                }
            }
            return lastScriptUri;
        }
    
        function loadRequiredScripts(uris, callback) {
            var lastScriptUri = getLastScriptUri(),
                baseUri = getFirstOffSplitBySubstring(lastScriptUri, "slideshow.js");

            function getFirstOffSplitBySubstring(fullString, searchString) {
                var found = fullString.indexOf(searchString);
                return found == -1 ? fullString : fullString.substr(0, found);
            }
    
            function scriptError() {
                console.error("Error loading script: " + this.getAttribute("src"));
                loadNextScript();
            }

            function scriptLoaded() {
                loadNextScript();
            }

            function loadNextScript() {
                var script,
                    uri;
                
                if (uris.length > 0) {
                    script = document.createElement("script"),
                    uri = uris.splice(0, 1)[0];

                    script.setAttribute("src", baseUri + uri);
                    script.setAttribute("type", "text/javascript");
                    script.addEventListener("load", scriptLoaded);
                    script.addEventListener("error", scriptError);
                    document.head.appendChild(script);
                }
                else {
                    callback();
                }
            }
            loadNextScript();
        }

        if (typeof window.setImmediate === "undefined") {
            window.setImmediate = function (callback) {
                window.setTimeout(callback, 0);
            };
        }

        loadRequiredScripts([
            "es5-shim.js", 
            "es6-shim.js", 
            "eventTarget.js", 
            "arrayWithEvent.js",
            "Blob.js",
            "FileSaver.js",
            "deflate.js",
            "inflate.js",
            "zip.js"
        ], function () {
            var documentImageList = new DocumentImageList();
            window.slideshowJs = new SlideshowJs(documentImageList);
            window.slideshowJs.toggle();

            documentImageList.processDocument(document);
        });
    })();
}
