if (typeof slideshowjs === "undefined") {
    var slideshowjs = (function () {
        var viewerStyle = "display: none; top: 0%; width: 100%; height: 100%; position: fixed; z-index: 1000;",
            almostFillStyle = "top: 0%; width: 100%; height: 100%; position: fixed;",
            imageFillStyle = "max-width:100%; max-height:100%; width:auto; height:auto;",
            controlStyle = "font-size: 300%; color: gray; opacity: 0.33; text-shadow: 1px 1px white, -1px -1px #444; top: 0%; left: 0%; position: fixed; z-index: 1001;",
            maxPages = Infinity,
            pages = 0,
            toArray = function(arrayLike) {
                var arr = [], idx = 0;
                for (idx = 0; idx < arrayLike.length; ++idx) {
                    arr.push(arrayLike[idx]);
                }
                return arr;
            },
            entries = [],
            getPathFromUri = function(uri) {
                var result = /[^:]+:\/\/[^/]+(\/[^?#]+)/.exec(uri);
                return result && result[1];
            },
            imgLinkToUriPair = function(original) {
                var fullUri = original.parentElement.getAttribute("data-super-full-img") || original.parentElement.href;
                return {
                    thumbnail: original.src,
                    full: fullUri
                };
            },
            uriPairFilter = function(pair) {
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
            },
            uriPairToImgEntry = function(pair) {
                var full = document.createElement("img"),
                    fullUri = pair.full;

                full.setAttribute("style", imageFillStyle);
                full.src = fullUri;
                full.onerror = function(e) {
                    var newIdx = entries.indexOf(full);
                    if (newIdx !== -1) {
                        entries.splice(newIdx, 1);
                        if (newIdx === currentIdx) {
                            removeCurrent();
                            updateFromIdx();
                        }
                        else {
                            updateEntryCount();
                        }
                    }
                };
                return full;
            },
            processDocument = function(document) {
                if (pages++ > maxPages) { return; }
                console.log("Before processing document: " + entries.length);
                var anyEntries = !!entries.length;
                entries.splice.apply(entries, [entries.length - 1, 0].concat(toArray(document.querySelectorAll("a > img")).
                    map(imgLinkToUriPair).filter(uriPairFilter).map(uriPairToImgEntry)));
                    
                if (entries && entries.length && !anyEntries) {
                    updateFromIdx();
                }
                else {
                    updateEntryCount();
                }
                console.log("After processing document: " + entries.length);
                var nexts = toArray(document.querySelectorAll("a")).filter(function(a) { return a.textContent.toLowerCase().trim() === "next"; });
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
            },
            viewer = document.createElement("div"),
            effective = document.createElement("div"),
            controls = document.createElement("div"),
            close = document.createElement("span"),
            next = document.createElement("span"),
            prev = document.createElement("span"),
            entryCount = document.createElement("span"),
            currentIdx = 0,
            removeCurrent = function() {
                effective.innerHTML = "";
            },
            updateFromIdx = function() {
                if (currentIdx < 0) {
                    currentIdx = entries.length + currentIdx;
                }
                if (entries.length === 0) {
                    currentIdx = 0;
                }
                else {
                    currentIdx = currentIdx % entries.length;
                }
                if (entries && entries.length) {
                    effective.appendChild(entries[currentIdx]);
                }
                else {
                    console.log("Empty entries.");
                }
                updateEntryCount();
            },
            updateEntryCount = function() { 
                entryCount.textContent = " " + currentIdx + " / " + entries.length + " ";
            },
            closeHandler = function() { viewer.style.display = "none"; },
            nextHandler = function() { 
                removeCurrent();
                ++currentIdx;
                updateFromIdx();
            },
            prevHandler = function() { 
                removeCurrent();
                --currentIdx;
                updateFromIdx();
            },
            toggle = function() {
                var viewerVisible = viewer.style.display !== "none";
                viewer.style.display = viewerVisible ? "none" : "block";
            };
        
        processDocument(document);
        prev.textContent = "< ";
        prev.onclick = prevHandler;
        controls.appendChild(prev);
        
        controls.appendChild(entryCount);
        
        close.textContent = "X";
        close.onclick = closeHandler;
        controls.appendChild(close);
        
        next.textContent = " >";
        effective.onclick = next.onclick = nextHandler;
        // controls.appendChild(next); // No need for next since clicking the image goes next.
        
        controls.setAttribute("style", controlStyle);
        viewer.appendChild(controls);
        
        effective.setAttribute("style", almostFillStyle);
        viewer.appendChild(effective);
        updateFromIdx();
        
        viewer.setAttribute("style", viewerStyle);
        document.body.appendChild(viewer);
        
        return {
            toggle: toggle
        };
    }());
}
slideshowjs.toggle();
