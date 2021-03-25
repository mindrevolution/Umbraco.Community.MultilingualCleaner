(function () {
    "use strict";
 
    function Controller($scope, $q, appState, entityResource, contentResource, navigationService, notificationsService, multilingualtoolResource) {

        const queue = [];
        function miniQ(queue = [], concurrent = 1) {
            this.total = queue.length;
            this.todo = queue;
            this.running = [];
            this.complete = [];
            this.count = concurrent;
        }
        miniQ.prototype.runNext = function () {
            return ((this.running.length < this.count) && this.todo.length);
        }
        miniQ.prototype.run = function () {
            while (this.runNext()) {
                const promise = this.todo.shift();
                promise.then(() => {
                    this.complete.push(this.running.shift());
                    this.run();
                });
                this.running.push(promise);
            }
        }
 
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

        const taskClearNode = (nodeId, cultures, unpublish) => new Promise((resolve, reject) => {
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
                                            resolve(nodeId);
                                        }, function (err) {
                                            vm.progressItemProcessed();
                                            //reject(err);
                                            resolve(nodeId);
                                        });
                                } else {
                                    contentResource.publishById(nodeId)
                                        .then(function (content) {
                                            vm.progressItemProcessed();
                                            resolve(nodeId);
                                        }, function (err) {
                                            vm.progressItemProcessed();
                                            resolve(nodeId);
                                        });
                                }
                            }, function (err) {
                                vm.progressItemProcessed();
                                console.error("MultilingualClear", "save failed", err, nodeId);
                                resolve(nodeId);
                            });
                    } else {
                        // - we're done with that anyways :)
                        vm.progressItemProcessed();
                        resolve(nodeId);
                    }
                });
        });

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
                taskClearNode(vm.nodeId, _cultures, vm.clearAndUnpublish);
            } else {
                // - recursive
                multilingualtoolResource.getDescendantIds(vm.nodeId).then(function (nodeIds) {
                    vm.progressReset(nodeIds.length);
                    //console.log("multilingualtoolResource", nodeIds);

                    // - queue tasks
                    angular.forEach(nodeIds, function (node, key) {
                        queue.push(taskClearNode(node, _cultures, vm.clearAndUnpublish))
                    });
                    const tasks = new miniQ(queue);
                    tasks.run();
                });
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

    }
 
    angular.module("umbraco").controller("Umbraco.Community.MultilingualTool.Action.ClearController", Controller);
})();