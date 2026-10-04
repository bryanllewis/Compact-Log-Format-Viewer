angular.module("logViewerApp").component("logTypes", {
    bindings: {
        chartcolors: "=",
        chartdata: "=",
        chartlabels: "=",
        logtypes: "=",
        onLogTypeClick: "&",
    },
    controllerAs: "vm",
    controller() {
        // Percentage of all log entries for a level's count
        this.percent = (count: number) => {
            const levels = this.logtypes || {};
            const total = ["verbose", "debug", "information", "warning", "error", "fatal"]
                .reduce((sum, level) => sum + (levels[level] || 0), 0);
            return total > 0 ? (count || 0) / total * 100 : 0;
        };

        this.logTypeClick = (logtype) => {
            this.onLogTypeClick({logtype});
        };
    },
    templateUrl: "components/log-types.html",
});
