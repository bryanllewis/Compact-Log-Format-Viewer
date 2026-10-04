import angular from "angular";
import { ipcRenderer } from "electron";

const logViewerApp = angular.module("logViewerApp", ["chart.js", "logViewerApp.resources"]);
logViewerApp.controller("LogViewerController", ["$scope", "$interval", "logViewerResource", function($scope, $interval, logViewerResource) {
    
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const vm = this;
    vm.isLoading = false;
    vm.fileOpen = false;
    vm.errorCount = 0;
    vm.messageTemplates = [];
    vm.logTypes = {};
    vm.chartData = [];
    vm.chartLabels = [ "Verbose", "Debug", "Information", "Warning", "Error", "Fatal" ];
    vm.chartColors = [ "#6c757d", "#20c997", "#17a2b8", "#ffc107", "#fd7e14", "#dc3545" ];
    vm.logs = {};
    vm.loadinglogs = false;
    vm.propertyNames = [];

    // Property names in the open log file, offered as suggestions in the search box
    const loadPropertyNames = () => {
        logViewerResource.getPropertyNames().then((response) => {
            vm.propertyNames = response.data;
        });
    };

    vm.logOptions = {};
    vm.logOptions.filterExpression = "";
    vm.logOptions.sortOrder = "Descending";
    vm.logOptions.pageNumber = 1;
    vm.logOptions.autoRefresh = "0";

    // Auto refresh - poll the server at the selected interval (seconds, "0" = disabled)
    // & reload the file only when it has changed, keeping the current search, sort & page
    let autoRefreshTimer = null;
    let autoRefreshInProgress = false;

    const autoRefresh = () => {
        if (!vm.fileOpen || vm.isLoading || autoRefreshInProgress) {
            return;
        }

        autoRefreshInProgress = true;
        logViewerResource.hasFileChanged()
            .then((response) => {
                if (response.data !== true) {
                    return;
                }

                return logViewerResource.reloadFile().then(() => {
                    logViewerResource.getNumberOfErrors().then((errors) => {
                        vm.errorCount = errors.data;
                    });
                    logViewerResource.getLogLevelCounts().then((totals) => {
                        setLogTypes(totals.data);
                    });
                    vm.performSearch();
                    loadPropertyNames();
                });
            })
            .catch((err) => {
                console.error("Auto refresh failed", err);
            })
            .finally(() => {
                autoRefreshInProgress = false;
            });
    };

    $scope.$watch(() => vm.logOptions.autoRefresh, (seconds) => {
        if (autoRefreshTimer) {
            $interval.cancel(autoRefreshTimer);
            autoRefreshTimer = null;
        }

        const intervalSeconds = Number(seconds);
        if (intervalSeconds > 0) {
            autoRefreshTimer = $interval(autoRefresh, intervalSeconds * 1000);
        }
    });

    vm.errorCountClick = () => {
        // When we click error count - Update filter expression & do NEW search
        vm.logOptions.filterExpression = "@Level='Error' or @Level='Fatal' or Has(@Exception)";
        vm.logOptions.pageNumber = 1;
        vm.performSearch();
    };

    vm.messageTemplateClick = (template) => {
        // When we click a message template - Update filter expression & do NEW search
        vm.logOptions.filterExpression = `@MessageTemplate = '${template.messageTemplate}'`;
        vm.logOptions.pageNumber = 1;
        vm.performSearch();
    };

    vm.logTypeClick = (logtype) => {
         // When we click a message template - Update filter expression & do NEW search
         vm.logOptions.filterExpression = `@Level = '${logtype}'`;
         vm.logOptions.pageNumber = 1;
         vm.performSearch();
    };

    vm.changePageNumber = (pageNumber) => {
        vm.logOptions.pageNumber = pageNumber;
        vm.performSearch();
    };

    vm.performSearch = () => {
        vm.loadinglogs = true;
        logViewerResource.getLogs(vm.logOptions).then((response) => {
            vm.logs = response.data.logs;
            vm.messageTemplates = response.data.messageTemplates;
            vm.loadinglogs = false;
        });
    };

    // Used by the button in the UI
    vm.openFileClick = () => {
        // Go & tell the renderer whos listening for 'logviewer.open-file-dialog'
        ipcRenderer.send("logviewer.open-file-dialog");
    };

    // Listen for events from RENDERER & update our VM
    // Which will flow down into our components
    ipcRenderer.on("logviewer.loading", (event:Electron.IpcRendererEvent, loading: boolean) => {
        vm.isLoading = loading;
        $scope.$applyAsync();
    });

    ipcRenderer.on("logviewer.file-opened", () => {
        vm.fileOpen = true;
        loadPropertyNames();
        $scope.$applyAsync();
    });

    ipcRenderer.on("logviewer.file-closed", () => {
        vm.fileOpen = false;
        vm.errorCount = 0;
        vm.messageTemplates = [];
        vm.logTypes = {};
        vm.chartData = [];
        vm.logs = {};
        vm.propertyNames = [];

        vm.logOptions = {};
        vm.logOptions.filterExpression = "";
        vm.logOptions.sortOrder = "Descending";
        vm.logOptions.pageNumber = 1;
        vm.logOptions.autoRefresh = "0";

        $scope.$applyAsync();
    });

    ipcRenderer.on("logviewer.data-errors", (event:Electron.IpcRendererEvent, errors: number) => {
        vm.errorCount = errors;
        $scope.$applyAsync();
    });

    const setLogTypes = (totals) => {
        vm.logTypes = totals;
        vm.chartData = [
            totals.verbose,
            totals.debug,
            totals.information,
            totals.warning,
            totals.error,
            totals.fatal,
        ];
    };

    ipcRenderer.on("logviewer.data-totals", (event:Electron.IpcRendererEvent, arg: any) => {
        setLogTypes(arg);
        $scope.$applyAsync();
    });

    ipcRenderer.on("logviewer.data-logs", (event:Electron.IpcRendererEvent, arg: any) => {
        vm.logs = arg.logs;
        vm.messageTemplates = arg.messageTemplates;
        $scope.$applyAsync();
    });

}]);
