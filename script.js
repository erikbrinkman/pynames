"use strict";
window.addEventListener("load", () => {

    var progress = document.getElementById("progress"),
        greeting = document.getElementById("greeting"),
        noResults = document.getElementById("no-results"),
        errorMessage = document.getElementById("error-message"),
        results = document.getElementById("results"),
        searchCancel = document.getElementById("search-cancel"),
        searchForm = document.getElementById("search"),
        searchBox = document.getElementById("search-box"),
        searchDiv = document.querySelector("#search > div");

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function empty(node) {
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }
    }

    function xmlGet(xml, field) {
        var field = xml.querySelector(field).lastChild;
        return field ? field.nodeValue : "";
    }

    function hasPy(word) {
        return /.*py.*/i.test(word) ? [word] : [];
    }

    function closeToPy(word) {
        var versions = [];
        word.replace(/p[ie]/gi, function(match, offset, string) {
            versions.push(word.slice(0, offset + 1) + "y" + word.slice(offset + 2));
        });
        return versions;
    }

    function endsInP(word) {
        var versions = [];
        word.replace(/p(\s|$)/gi, function(match, c1, offset, string) {
            versions.push(word.slice(0, offset + 1) + "y" + word.slice(offset + 1));
        });
        return versions;
    }

    function removeLetter(word) {
        var versions = [];
        word.replace(/p[^pyie\s]y/gi, function(match, offset, string) {
            versions.push(word.slice(0, offset + 1) + word.slice(offset + 2))
        });
        return versions;
    }

    function anyP(word) {
        var versions = []
        word.replace(/p([^ieyp\s]|$)/gi, function(match, c1, offset, string) {
            versions.push(word.slice(0, offset + 1) + "y" + word.slice(offset + 1));
        });
        return versions;
    }

    var transforms = [
        hasPy,
        closeToPy,
        endsInP,
        removeLetter,
        anyP
    ];

    function parseXml(xml) {
        return _.map(xml.lastChild.children, function(result) {
            var term = xmlGet(result, "term");
            var synonyms = xmlGet(result, "synonyms").split(", ").concat(term.split(", "));
            synonyms.sort();
            
            return {
                term: term,
                definition: xmlGet(result, "definition"),
                partofspeech: xmlGet(result, "partofspeech"),
                example: xmlGet(result, "example"),
                synonyms: _.unique(synonyms, true),
                antonyms: xmlGet(result, "antonyms").split(", "),
            };
        });
    };

    function addPyNames(results) {
        var pynames = {}
        for (var result of results) {
            for (var ti = 0; ti < transforms.length; ++ti) {
                for (var synonym of result.synonyms) {
                    for (var pyname of transforms[ti](synonym)) {
                        var info = pynames[pyname] || {
                            definitions: new Set(),
                            synonyms: new Set(),
                            antonyms: new Set()
                        };
                        info.definitions.add(result.definition);
                        for (var syn of result.synonyms) {
                            info.synonyms.add(syn);
                        }
                        for (var ant of result.antonyms) {
                            info.antonyms.add(ant);
                        }
                        info.rank = info.rank || ti;
                        info.pyname = pyname;
                        info.original = synonym;
                        pynames[pyname] = info;
                    }
                }
            }
        }

        return _.sortBy(_.values(pynames), "rank");
    }

    function displayNames(names) {
        empty(results);
        progress.classList.remove("active");
        greeting.classList.remove("active");
        noResults.classList.remove("active");
        errorMessage.classList.remove("active");
        document.querySelector("main").scrollTop = 0;
        if (names === null) {
            errorMessage.classList.add("active");
        } else if (names.length === 0) {
            noResults.classList.add("active");
        } else {
            names.forEach((name, i) => {

                var card = document.createElement("div");
                card.classList.add("mdl-card", "mdl-shadow--4dp", "result");

                var title = document.createElement("div");
                card.appendChild(title);
                title.classList.add("mdl-card__title");
                var titleText = document.createElement("h2");
                title.appendChild(titleText);
                titleText.classList.add("mdl-card__title-text");
                titleText.appendChild(document.createTextNode(capitalizeFirstLetter(name.pyname + " (" + name.original + ")")));

                var info = document.createElement("div");
                card.appendChild(info);
                info.classList.add("mdl-card__supporting-text");

                var infos = document.createElement("dl");
                info.appendChild(infos);
                infos.classList.add("info");

                var category = document.createElement("dt");
                infos.appendChild(category);
                category.appendChild(document.createTextNode("Definitions"));
                category = document.createElement("dd");
                infos.appendChild(category);
                var list = document.createElement("ul");
                category.appendChild(list);
                list.classList.add("mimic-inline");
                for (var definition of name.definitions) {
                    var li = document.createElement("li");
                    list.appendChild(li);
                    li.appendChild(document.createTextNode(definition.charAt(0).toUpperCase() + definition.slice(1)));
                }

                name.synonyms.delete("");
                if (name.synonyms.size > 0) {
                    category = document.createElement("dt");
                    infos.appendChild(category);
                    category.appendChild(document.createTextNode("Synonyms"));
                    category = document.createElement("dd");
                    infos.appendChild(category);
                    list = document.createElement("ul");
                    category.appendChild(list);
                    list.classList.add("inline");
                    for (var synonym of name.synonyms) {
                        var li = document.createElement("li");
                        list.appendChild(li);
                        var a = document.createElement("a");
                        li.appendChild(a);
                        a.href = "#/" + encodeURIComponent(synonym);
                        a.appendChild(document.createTextNode(synonym));
                    }
                }

                name.antonyms.delete("");
                if (name.antonyms.size > 0) {
                    category = document.createElement("dt");
                    infos.appendChild(category);
                    category.appendChild(document.createTextNode("Antonyms"));
                    category = document.createElement("dd");
                    infos.appendChild(category);
                    list = document.createElement("ul");
                    category.appendChild(list);
                    list.classList.add("inline");
                    for (var antonym of name.antonyms) {
                        var li = document.createElement("li");
                        list.appendChild(li);
                        var a = document.createElement("a");
                        li.appendChild(a);
                        a.href = "#/" + encodeURIComponent(antonym);
                        a.appendChild(document.createTextNode(antonym));
                    }
                }

                results.appendChild(card);
                componentHandler.upgradeElement(card);
                setTimeout(() => card.classList.add("show"), 5 + 200 * i);  // Repainting issues + cascade
            });
        }
    }

    function responseCallback() {
        var names = null;
        try {
            var results = parseXml(this.responseXML);
            names = addPyNames(results);
        } catch (ex) {
            console.error("Parsing threw exception:", ex, "with xml:", this.responseXML);
        }
        displayNames(names);
    }

    function search(query) {
        var xhr = new XMLHttpRequest();
        xhr.open(
                "GET",
                "//www.stands4.com/services/v2/syno.php?uid=4067&tokenid=CKSFIKQwyaymSxxn&word=" + query,
                true
                );
        xhr.addEventListener("load", responseCallback);

        progress.classList.add("active");
        xhr.send();
    }
    
    function updateCancelButton() {
        if (searchBox.value.trim().length == 0) {
            searchCancel.classList.remove("show");
        } else {
            searchCancel.classList.add("show");
        }
    }

    function checkHash() {
        var hash = window.location.hash;
        if (hash.charAt(1) == "/") {
            var query = decodeURIComponent(hash.slice(2));
            searchDiv.MaterialTextfield.change(query);
            search(query);
        } else {
            searchDiv.MaterialTextfield.change("");
            empty(results);
        }
        updateCancelButton();
    }

    window.addEventListener("hashchange", checkHash);

    function submitHandler(event) {
        event.preventDefault();
        window.location.hash = "#/" + encodeURIComponent(searchBox.value);
    }

    searchCancel.addEventListener("click", e => {
        searchBox.value = "";
        searchBox.focus();
        searchCancel.classList.remove("show");
    });

    searchBox.addEventListener("input", updateCancelButton);

    searchForm.addEventListener("submit", submitHandler);

    checkHash();
});
