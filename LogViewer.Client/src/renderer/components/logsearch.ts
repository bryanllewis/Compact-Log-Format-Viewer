import angular from "angular";

// Serilog expression built-in properties, suggested alongside the properties found in the log file
const builtInPropertyNames = ["@Exception", "@Level", "@Message", "@MessageTemplate", "@Properties", "@Timestamp"];
const maxSuggestions = 10;
const wordCharacter = /[A-Za-z0-9_@]/;

angular.module("logViewerApp").component("logSearch", {
    bindings: {
        logOptions: "=",
        propertyNames: "<",
        onPerformSearch: "&",
    },
    controllerAs: "vm",
    controller: ["$element", "$timeout", function($element, $timeout) {

        // Property name suggestions for the word at the caret in the search box
        this.suggestions = [];
        this.activeSuggestion = 0;

        // Position of the word being completed within the search expression
        let wordStart = 0;
        let wordEnd = 0;

        const searchInput = (): HTMLInputElement => $element[0].querySelector("input.search-input");

        this.hideSuggestions = () => {
            this.suggestions = [];
        };

        this.updateSuggestions = () => {
            const input = searchInput();
            const text = input.value;
            const caret = input.selectionStart ?? text.length;

            // Don't suggest property names inside 'string' or "string" values
            if (isInsideQuotes(text, caret)) {
                this.hideSuggestions();
                return;
            }

            wordStart = caret;
            while (wordStart > 0 && wordCharacter.test(text[wordStart - 1])) {
                wordStart--;
            }

            wordEnd = caret;
            while (wordEnd < text.length && wordCharacter.test(text[wordEnd])) {
                wordEnd++;
            }

            const prefix = text.substring(wordStart, caret).toLowerCase();
            if (prefix.length === 0) {
                this.hideSuggestions();
                return;
            }

            const word = text.substring(wordStart, wordEnd);
            const names = [...(this.propertyNames || []), ...builtInPropertyNames].filter((name) => name !== word);

            // Names starting with what has been typed first, then names containing it
            const startsWith = names.filter((name) => name.toLowerCase().startsWith(prefix));
            const contains = names.filter((name) => !name.toLowerCase().startsWith(prefix) && name.toLowerCase().includes(prefix));

            this.suggestions = [...startsWith, ...contains].slice(0, maxSuggestions);
            this.activeSuggestion = 0;
        };

        this.selectSuggestion = (name: string) => {
            const text = this.logOptions.filterExpression || "";
            this.logOptions.filterExpression = text.substring(0, wordStart) + name + text.substring(wordEnd);
            this.hideSuggestions();

            // Put the caret straight after the inserted property name once the input has updated
            const caret = wordStart + name.length;
            $timeout(() => {
                const input = searchInput();
                input.focus();
                input.setSelectionRange(caret, caret);
            });
        };

        this.onKeyDown = ($event: KeyboardEvent) => {
            if (this.suggestions.length > 0) {
                switch ($event.key) {
                    case "ArrowDown":
                        this.activeSuggestion = (this.activeSuggestion + 1) % this.suggestions.length;
                        $event.preventDefault();
                        return;
                    case "ArrowUp":
                        this.activeSuggestion = (this.activeSuggestion - 1 + this.suggestions.length) % this.suggestions.length;
                        $event.preventDefault();
                        return;
                    case "Enter":
                    case "Tab":
                        this.selectSuggestion(this.suggestions[this.activeSuggestion]);
                        $event.preventDefault();
                        return;
                    case "Escape":
                        this.hideSuggestions();
                        $event.preventDefault();
                        return;
                }
            }

            if ($event.key === "Enter") {
                this.search(this.logOptions);
            }
        };

        // Functions
        this.search = search;
        this.clear = clear;
    }],
    templateUrl: "components/log-search.html",
});

function isInsideQuotes(text: string, position: number): boolean {
    let quote = null;
    for (let i = 0; i < position; i++) {
        const c = text[i];
        if (quote === null && (c === "'" || c === "\"")) {
            quote = c;
        } else if (c === quote) {
            quote = null;
        }
    }
    return quote !== null;
}

function search(logOptions) {
    this.hideSuggestions();

    // Reset pagenumber back to 1
    logOptions.pageNumber = 1;
    this.onPerformSearch();
}

function clear(logOptions) {
    this.hideSuggestions();

    // Reset pagenumber back to 1 & empty out search
    logOptions.pageNumber = 1;
    logOptions.filterExpression = "";

    // Perform new search back to page 1 with no search
    this.onPerformSearch();
}
