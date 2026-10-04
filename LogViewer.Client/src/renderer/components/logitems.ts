import angular from "angular";

angular.module("logViewerApp").component("logItems", {
    bindings: {
        logitems: "=",
        logOptions: "=",
        onPerformSearch: "&",
    },
    controllerAs: "vm",
    controller() {
        this.loadinglogs = false;

        // Functions
        this.search = search;
        this.findItem = findItem;
        this.propertyPath = propertyPath;
        this.sortedPropertyNames = sortedPropertyNames;
    },
    templateUrl: "components/log-items.html",
});

function search(logOptions) {
    // Reset pagenumber back to 1
    logOptions.pageNumber = 1;
    this.onPerformSearch();
}

// Property names of a log entry in alphabetical order, worked out once per entry
function sortedPropertyNames(log): string[] {
    if (!log.sortedPropertyNames) {
        log.sortedPropertyNames = Object.keys(log.properties || {})
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }
    return log.sortedPropertyNames;
}

// Builds the Serilog expression accessor for a property, nested under parentPath when given
function propertyPath(parentPath: string | null, name: string): string {
    const isIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);

    if (!parentPath) {
        return isIdentifier ? name : `@p[${quote(name)}]`;
    }

    return isIdentifier ? `${parentPath}.${name}` : `${parentPath}[${quote(name)}]`;
}

// Escapes a string as a Serilog expression 'string' literal
function quote(text: string): string {
    return `'${text.replace(/'/g, "''")}'`;
}

function findItem(path: string, value) {
    if (value === null) {
        this.logOptions.filterExpression = `${path} is null`;
    } else if (typeof value === "number" || typeof value === "boolean") {
        this.logOptions.filterExpression = `${path} = ${value}`;
    } else {
        this.logOptions.filterExpression = `${path} = ${quote(String(value))}`;
    }

    // Start the new search on page 1
    this.logOptions.pageNumber = 1;
    this.onPerformSearch();
}
