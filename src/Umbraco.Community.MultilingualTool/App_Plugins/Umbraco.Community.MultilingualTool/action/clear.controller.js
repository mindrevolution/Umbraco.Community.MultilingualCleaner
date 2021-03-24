(function () {
    "use strict";
 
    function Controller($scope, appState, entityResource, contentResource, navigationService, notificationsService, multilingualtoolResource) {
 
        var vm = this;
        vm.variants = [];
        vm.buttonState = "init";
        vm.processing = false;
        vm.clearAndUnpublish = false;
        vm.recursive = false;
        vm.progress = 0;
        vm.progressItems = 0;
        vm.progressItemsTotal = 1;
        vm.done = false;

        vm.nodeId = appState.getMenuState("currentNode").id;
        vm.nodeName = "[#" + vm.nodeId + "]";
        contentResource.getById(vm.nodeId).then(function (item) {
            vm.node = item;
            var _variants = item.variants;
            vm.hasVariants = _variants !== null && _variants.length > 1 || _variants[0].language !== null;

            if (vm.hasVariants) {
                vm.nodeName = _variants[0].name;

                // - build settings list
                angular.forEach(_variants, function (value, key) {
                    //// - only add variants that were actually created
                    //if (value.state !== "NotCreated") {
                    //    vm.variants.push({
                    //        key: value.language.culture,
                    //        selected: false,
                    //        variant: value
                    //    });
                    //}

                    var variantState = " ⚬ " + value.state;
                    var variant = {
                        key: value.language.culture,
                        name: "",
                        selected: false,
                        variant: value
                    }
                    if (value.displayName) {
                        variant.name = value.displayName + variantState;
                    }
                    if (value.language.displayName) {
                        variant.name = value.language.displayName + variantState;
                    }
                    if (value.language.name) {
                        variant.name = value.language.name + variantState;
                    }
                    vm.variants.push(variant);
                });
            } else {
                // - no variants on node? make it recursive by default!
                vm.recursive = true;
            }
        });

        vm.toggleClear = function () {
            if (vm.clearAndUnpublish) {
                vm.clearAndUnpublish = false;
                return;
            }
            vm.clearAndUnpublish = true;
        }

        vm.toggleRecursive = function () {
            if (vm.recursive) {
                vm.recursive = false;
                return;
            }
            vm.recursive = true;
        }

        vm.closeDialog = function () {
            navigationService.hideDialog();
        };
      
        vm.processNode = function () {
            vm.done = false;
            vm.buttonState = "busy";
            vm.processing = true;
            vm.progress = 0;

            var _cultures = [];
            angular.forEach(vm.variants, function (value, key) {
                if (value.selected) {
                    _cultures.push(value.key);
                }
            });

            if (!vm.recursive) {
                // - just this node ... easy! :)
                vm.clearNode(vm.nodeId, _cultures, vm.clearAndUnpublish)
            } else {
                // - recursive
                vm.clearNodeWithDescendants(vm.nodeId, _cultures, vm.clearAndUnpublish)
            }

            // - release UI
            vm.buttonState = "success";
            vm.processing = false;
            vm.done = true;
        };

        vm.progressItemProcessed = function () {
            vm.progressItems++;
            vm.progress = Math.round(100 / vm.progressItemsTotal * vm.progressItems);
            console.log("progress now at", vm.progress);
        }

        vm.clearNodeWithDescendants = function (nodeId, cultures, unpublish) {
            var nodesList = [];

            multilingualcleanerResource.getDescendantIds(nodeId).then(function (response) {
                nodesList = response;
                vm.progressItemsTotal = nodesList.length;
                //console.log("multilingualcleanerResource", nodesList);

                angular.forEach(nodesList, function (node, key) {
                    vm.clearNode(node, cultures, unpublish);
                });
            });
        }

        vm.clearNode = function (nodeId, cultures, unpublish) {
            var doSave = false;

            //console.log("clear node", nodeId, cultures, "unpublish:" + unpublish);

            // - fetch node and clear it then
            contentResource.getById(nodeId)
                .then(function (content) {
                    //console.log("contentResource", content);

                    angular.forEach(content.variants, function (variant, index) {
                        // - only act on selected languages and only if variant was ever created
                        if (cultures.includes(variant.language.culture) && variant.state !== "NotCreated") {

                            angular.forEach(variant.tabs, function (tab, index) {

                                angular.forEach(tab.properties, function (prop, index) {
                                    // - we can only clean non-mandatory values
                                    if (!prop.readonly && !prop.validation.mandatory) {
                                        prop.value = null;
                                    }
                                });

                            });

                            // - flag to save updated variant later
                            variant.save = true;
                            doSave = true;
                        }
                    });

                    // - save node (updated variants)
                    if (doSave) {
                        contentResource.save(content, false, [], false)
                            .then(function (content) {
                                //console.log("saved content", content);

                                // - now publish OR unpublish this node
                                // - (yes, two step process here!)
                                if (unpublish) {
                                    contentResource.unpublish(nodeId)
                                        .then(function (content) {
                                            vm.progressItemProcessed();
                                            console.log("unpublished content", nodeId);
                                        });
                                } else {
                                    contentResource.publishById(nodeId)
                                        .then(function (content) {
                                            vm.progressItemProcessed();
                                            console.log("published content", nodeId);
                                        });
                                }
                            });
                    }
                });
        };
    }
 
    angular.module("umbraco").controller("Umbraco.Community.MultilingualTool.Action.Controller", Controller);
})();