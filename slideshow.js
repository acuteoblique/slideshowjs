(function slideshowGlobal() {
    "use strict";
    if (typeof window.slideshowJs !== "undefined") {
        window.slideshowJs.toggle();
    }
    else {
        function getPathFromUri(uri) {
            var result = /[^:]+:\/\/[^/]+(\/[^?#]+)/.exec(uri);
            return result && result[1];
        }

        function DocumentImageList() {
            var maxPages = 20,
                pages = 0,
                entries = new ArrayWithEvent();

            function imgLinkToUriPair(original) {
                var fullUri = original.parentElement.getAttribute("data-super-full-img") || original.parentElement.href;
                return {
                    thumbnail: original.src,
                    full: fullUri
                };
            }
    
            function uriPairFilter(pair) {
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
    
            function uriPairToImgEntry(pair) {
                var full = document.createElement("img"),
                    fullUri = pair.full;
    
                full.src = fullUri;
                full.onerror = function(e) {
                    var newIdx = entries.indexOf(full);
                    if (newIdx !== -1) {
                        entries.splice(newIdx, 1);
                    }
                };
                return full;
            }
    
            function processDocument(document) {
                if (pages++ > maxPages) { return; }
                console.log("Before processing document: " + entries.length);
                var anyEntries = !!entries.length;
                entries.splice.apply(entries, [entries.length - 1, 0].concat(Array.from(document.querySelectorAll("a > img")).
                    map(imgLinkToUriPair).filter(uriPairFilter).map(uriPairToImgEntry)));
                    
                console.log("After processing document: " + entries.length);
                var nexts = Array.from(document.querySelectorAll("a")).filter(function(a) { return a.textContent.toLowerCase().trim() === "next"; });
                if (nexts && nexts.length) {
                    setTimeout(function() {
                    console.log("Found " + nexts.length + " possible nexts. Using " + nexts[nexts.length - 1].href);
                    var iframe = document.createElement("iframe");
                    iframe.src = nexts[nexts.length - 1].href;
                    iframe.style.display = "none";
                    iframe.onload = function() {
                        processDocument(iframe.contentDocument);
                    }
                    iframe.onerror = function() { console.error("Error attempting to read next: " + iframe.src); }
                    document.body.appendChild(iframe);
                    }, 10000);
                }
            }
    
            this.processDocument = processDocument;
            this.entries = entries;
        }

        function SlideshowJs(documentImageList) {
            var viewerStyle = "display: none; top: 0%; width: 100%; height: 100%; position: fixed; z-index: 1000;",
                almostFillStyle = "top: 0%; width: 100%; height: 100%; position: fixed;",
                imageFillStyle = "max-width:100%; max-height:100%; width:auto; height:auto;",
                bgImageFillStyle = imageFillStyle + " opacity: 0;",
                controlStyle = "font-size: 400%; color: black; opacity: 0.5; text-shadow: 1px 1px white, -1px -1px #444; top: 0%; left: 0%; position: fixed; z-index: 1001;",
                viewer = document.createElement("div"),
                effective = document.createElement("div"),
                position = document.createElement("div"),
                controls = document.createElement("div"),
                close = document.createElement("span"),
                next = document.createElement("span"),
                prev = document.createElement("span"),
                currentIdx = 0;
    
            function removeCurrent() {
                var target = documentImageList.entries[currentIdx];
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
                    documentImageList.entries[currentIdx].setAttribute("style", imageFillStyle);
                    effective.appendChild(documentImageList.entries[currentIdx]);
                    if (currentIdx + 1 < documentImageList.entries.length) {
                        documentImageList.entries[currentIdx + 1].setAttribute("style", bgImageFillStyle);
                        effective.appendChild(documentImageList.entries[currentIdx + 1]);
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
            prev.onclick = function prevHandler() { 
                removeCurrent();
                --currentIdx;
                updateFromIdx();
            };
            controls.appendChild(prev);

            controls.appendChild(position);
            
            close.textContent = "X";
            close.onclick = function closeHandler() { viewer.style.display = "none"; };
            controls.appendChild(close);
            
            next.textContent = " >";
            effective.onclick = next.onclick = function nextHandler() { 
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
    
        function loadRequiredScripts(uris, callback) {
            var scripts = document.querySelectorAll("script"),
                lastScript = scripts[scripts.length - 1],
                lastScriptUri = scripts[scripts.length - 1].getAttribute("src"),
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
            "arrayWithEvent.js"
        ], function () {
            var documentImageList = new DocumentImageList();
            window.slideshowJs = new SlideshowJs(documentImageList);
            window.slideshowJs.toggle();

            documentImageList.processDocument(document);
        });
    }
})();
