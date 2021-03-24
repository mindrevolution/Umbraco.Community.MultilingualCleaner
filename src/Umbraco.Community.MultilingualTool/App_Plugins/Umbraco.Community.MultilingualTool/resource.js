angular.module("umbraco.resources").factory("multilingualtoolResource",
    function ($q, $http, umbRequestHelper) {
        return {
            getDescendantIds: function (nodeId) {
                return umbRequestHelper.resourcePromise(
                    $http.get("backoffice/MultilingualTool/Content/GetDescendantIds?nodeId=" + nodeId),
                    "Failed to retrieve descendant ids");
            }
        };
    }
);