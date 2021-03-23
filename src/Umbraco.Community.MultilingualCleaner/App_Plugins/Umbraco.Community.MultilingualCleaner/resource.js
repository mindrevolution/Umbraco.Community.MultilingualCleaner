angular.module("umbraco.resources").factory("multilingualcleanerResource",
    function ($q, $http, umbRequestHelper) {
        return {
            getDescendantIds: function (nodeId) {
                return umbRequestHelper.resourcePromise(
                    $http.get("backoffice/MultilingualCleaner/Content/GetDescendantIds?nodeId=" + nodeId),
                    "Failed to retrieve descendant ids");
            }
        };
    }
);