(function () {
    "use strict";
 
    function Controller($scope, appState, entityResource, contentResource, navigationService, notificationsService, multilingualtoolResource) {
 
        var vm = this;
        vm.variants = [];
        vm.buttonState = "init";
        vm.processing = false;
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
                vm.progressReset(1);
                vm.createVariants(vm.nodeId, _cultures)
            } else {
                // - recursive
                vm.createVariantsRecursive(vm.nodeId, _cultures)
            }

            // - release UI
            vm.buttonState = "success";
            vm.processing = false;
            vm.done = true;
        };

        vm.progressItemProcessed = function () {
            vm.progressItems++;
            vm.progress = Math.round(100 / vm.progressItemsTotal * vm.progressItems);
        }

        vm.progressReset = function (total) {
            vm.progressItemsTotal = 1;
            if (total !== undefined && total !== null) {
                vm.progressItemsTotal = total;
            }
            vm.progressItems = 0;
            vm.progress = 0;
        }

        vm.createVariantsRecursive = function (nodeId, cultures) {
            var nodesList = [];

            multilingualtoolResource.getDescendantIds(nodeId).then(function (response) {
                nodesList = response;
                //console.log("multilingualtoolResource", nodesList, vm.progressItemsTotal + " progress items", vm.progressItems);

                vm.progressReset(nodesList.length);
                    
                angular.forEach(nodesList, function (node, key) {
                    vm.createVariants(node, cultures);
                });
            });
        }

        vm.createVariants = function (nodeId, cultures) {
            var doSave = false;

            console.debug("create variant", nodeId, cultures);

            // - fetch node and add new variants
            contentResource.getById(nodeId)
                .then(function (content) {
                    //console.log("contentResource", content);

                    angular.forEach(content.variants, function (variant, index) {
                        // - only act on selected languages and only if variant does not exist
                        if (cultures.includes(variant.language.culture) && variant.state === "NotCreated") {

                            variant.name = content.variants[0].name;

                            angular.forEach(variant.tabs, function (tab, index) {

                                angular.forEach(tab.properties, function (prop, index) {
                                    // - we can only add non-mandatory values
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
                                contentResource.publishById(nodeId)
                                    .then(function (content) {
                                        vm.progressItemProcessed();
                                        console.debug("published content", nodeId);
                                    });
                            });
                    } else {
                        // - we're done with that anyways :)
                        vm.progressItemProcessed();
                    }
                });
        };
    }
 
    angular.module("umbraco").controller("Umbraco.Community.MultilingualTool.Action.AddController", Controller);
})();