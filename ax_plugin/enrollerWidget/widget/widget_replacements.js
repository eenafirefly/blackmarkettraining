jQuery(function ($) {
    var currentMousePos = { x: -1, y: -1 };

    var ENTER_KEYCODE = 13;
    $(document).mousemove(function (event) {
        currentMousePos.x = event.pageX;
        currentMousePos.y = event.pageY;
    });

    function getWindowCoordinates(theWindow) {
        return {
            x: theWindow.scrollLeft(),
            y: theWindow.scrollTop(),
            cx: theWindow[0].innerWidth || theWindow.width(),
            cy: theWindow[0].innerHeight || theWindow.height()
        };
    }

    function pointInRectangle(x, y, windowCoordinates) {
        return (
            x >= windowCoordinates.x &&
            x <= windowCoordinates.x + windowCoordinates.cx &&
            y >= windowCoordinates.y &&
            y <= windowCoordinates.y + windowCoordinates.cy
        );
    }

    function isOutOfSight(element, windowCoordinates) {
        var offset = element.offset(),
            width = element.outerWidth(true),
            height = element.outerHeight(true);

        return !(
            pointInRectangle(offset.left, offset.top, windowCoordinates) ||
            pointInRectangle(offset.left + width, offset.top, windowCoordinates) ||
            pointInRectangle(offset.left + width, offset.top + height, windowCoordinates) ||
            pointInRectangle(offset.left, offset.top + height, windowCoordinates)
        );
    }
    function getWindowCoordinates(theWindow) {
        return {
            x: theWindow.scrollLeft(),
            y: theWindow.scrollTop(),
            cx: theWindow[0].innerWidth || theWindow.width(),
            cy: theWindow[0].innerHeight || theWindow.height()
        };
    }
    function fitSegmentInsideSegment(windowSize, segmentSize, offset, desired) {
        var returnValue = desired;

        if (windowSize < segmentSize) {
            // Center segment if it's bigger than the window
            returnValue = offset + (windowSize - segmentSize) / 2;
        } else {
            // Else center it at the desired coordinate while keeping it completely inside the window
            returnValue = Math.min(
                Math.max(offset, desired - segmentSize / 2),
                offset + windowSize - segmentSize
            );
        }

        return returnValue;
    }

    $.fn.enhanceWithin = function () {
        var $this = this;

        // Add any widgets that have to be explicitly instantiated here.
        $this.find(".ax-flip-switch").flipswitch();
    };
    function loader(state, options) {
        var loader = $("div.ui-loader");
        if (loader.length === 0) {
            loader = $("<div/>").addClass("ui-loader").addClass("ui-corner-all");
            loader.append($("<span></span>").addClass("ui-icon-loading"));
            loader.append('<h1 class="loader-text"></h1>');
            if ($(".enroller-content").length) {
                $(".enroller-content").append(loader);
            } else {
                $("body").append(loader);
            }
            loader.hide();
        }
        if (options && options.theme) {
            loader.addClass("ui-body-" + options.theme);
        } else {
            loader.removeClass("ui-body-a").removeClass("ui-body-b");
        }
        if (state === "show") {
            $("html").addClass("ui-loading");
            if (options && options.text && options.textVisible) {
                loader.find(".loader-text").empty().append(options.text);
                loader.addClass("ui-loader-verbose");
            } else {
                loader.removeClass("ui-loader-verbose");
                loader.find(".loader-text").empty();
            }
            loader.show();
        }
        if (state === "hide") {
            $("html").removeClass("ui-loading");
            loader.hide();
        }
    }
    $.mobile = {
        loading: loader,
        activePage: $("body"),
        ns: "",
        getAttribute: function (element, key) {
            var data;

            element = element.jquery ? element[0] : element;

            if (element && element.getAttribute) {
                data = element.getAttribute("data-" + $.mobile.ns + key);
            }

            // Copied from core's src/data.js:dataAttr()
            // Convert from a string to a proper data type
            try {
                data =
                    data === "true"
                        ? true
                        : data === "false"
                        ? false
                        : data === "null"
                        ? null
                        : // Only convert to a number if it doesn't change the string
                        +data + "" === data
                        ? +data
                        : rbrace.test(data)
                        ? window.JSON.parse(data)
                        : data;
            } catch (err) {}

            return data;
        }
    };

    /**
     * List of items, with custom icon processing
     * List dividers
     * list header
     * List Counts? - don't use these that I can recall
     * filtering
     * auto-division.
     *
     */
    $.axWidget("axcelerate.listview", {
        options: {
            classListElement:
                "ui-btn ui-btn-icon-right ui-alt-icon ui-nodisc-icon ui-icon-carat-r ui-li-static ui-body-inherit",
            classListDivider: "ui-li-divider ui-bar-inherit",
            classListView: "ui-listview ui-listview-inset ui-corner-all ui-shadow",
            autodividers: false,
            autodividersSelector: function (li) {
                if ($(li).text() === "") {
                    return $(li).text().slice(0, 1).toUpperCase();
                }
                return $(li).text().slice(0, 1).toUpperCase();
            }
        },
        _create: function () {
            // add markup to element / detect if already marked up.

            var $this = this;
            var element = $this.element;
            $("body > div").addClass("ui-page-theme-a");

            element.addClass("ax-listview").addClass(this.options.classListView);

            element.children("li").each(function () {
                var child = $(this);
                $this.applyMarkup(child);
            });

            if (this.options.autodividers) {
                this.applyAutoDividers();
            }

            // loop through children and apply markup
            // if filterable, will need to identify that.
        },

        applyAutoDividers: function () {
            // here we would loop through children, call the autoDivider function for each child
            // We would track what the previous childs text was.
            // We would assume that the list is sorted already.
            var $this = this;
            var lastDivider, lastText;
            $this.element.children("li").each(function () {
                var child = $(this);
                if (child.hasClass("ax-list-divider") || child.data("role") === "list-divider") {
                    // always remove dividers so they are regenerated.
                    child.remove();
                } else {
                    var dividerText = $this.options.autodividersSelector(child);
                    if (dividerText && dividerText !== lastText) {
                        var newDivider = $("<li />");
                        newDivider.text(dividerText);
                        $this.applyMarkup(newDivider, true);
                        lastDivider = newDivider;
                        newDivider.insertBefore(child);
                    }
                    lastText = dividerText;
                }
            });
        },
        applyMarkup: function (child, divider) {
            if (child.hasClass("ax-list-element") && !divider) {
                child.addClass(this.options.classListElement);
                return;
            } else if (child.hasClass("ax-list-divider") || divider) {
                child.addClass(this.options.classListDivider).addClass("ax-list-divider");
                return;
            } else if (child.data("role") === "list-divider") {
                child.addClass(this.options.classListDivider);
                return;
            }
            child.addClass(this.options.classListElement).addClass("ax-list-element");
        },
        refresh: function () {
            this._create();
        },
        destroy: function () {
            if (this.removed) {
                return;
            }
            this.removed = true;
            if (this.element && this.element.length) {
                this.element.remove();
            }
        }
    });

    /**
     * Place sub elements in a specific layout
     * Vertical or horizontal.
     * @deprecated
     */
    $.axWidget("axcelerate.controlgroup", {
        options: {},
        _create: function () {
            // Will need to look at the div, determine if it is already "control-groupy"
            // if it is, then this would call the 'refresh' action.
            // if not, then parse children and determine how to handle them.
        },
        refresh: function () {
            // if refreshing, will need to identify children, determine if there are any that are new and apply markup.
            // Also will need to check vertical vs horizontal.
        },
        destroy: function () {
            if (this.removed) {
                return;
            }
            this.removed = true;
            if (this.element && this.element.length) {
                this.element.remove();
            }
        }
    });

    /**
     * At it's core something that positions a message / content to the center of the page.
     * Also used for tooltips. Likely another case to put the tooltip elsewhere
     */
    $.axWidget("axcelerate.popup", {
        options: {
            open: false,
            closeButton: false,
            destroyOnClose: false,
            noOverlay: false,
            isToolTip: false
        },

        _calculateFinalLocation: function (desired, clampInfo) {
            var returnValue,
                rectangle = clampInfo.rc,
                menuSize = clampInfo.menuSize;

            // Center the menu over the desired coordinates, while not going outside the window
            // tolerances. This will center wrt. the window if the popup is too large.
            returnValue = {
                left: fitSegmentInsideSegment(rectangle.cx, menuSize.cx, rectangle.x, desired.x),
                top: fitSegmentInsideSegment(rectangle.cy, menuSize.cy, rectangle.y, desired.y)
            };

            // Make sure the top of the menu is visible
            returnValue.top = Math.max(0, returnValue.top);

            // If the height of the menu is smaller than the height of the document align the bottom
            // with the bottom of the document

            returnValue.top -= Math.min(
                returnValue.top,
                Math.max(0, returnValue.top + menuSize.cy - this.document.height())
            );

            return returnValue;
        },

        // Try and center the overlay over the given coordinates
        _placementCoords: function (desired) {
            return this._calculateFinalLocation(desired, this._clampPopupWidth());
        },

        _clampPopupWidth: function (infoOnly) {
            var menuSize,
                windowCoordinates = getWindowCoordinates(this.window),
                // Rectangle within which the popup must fit
                rectangle = {
                    x: 5,
                    y: windowCoordinates.y + 5,
                    cx: windowCoordinates.cx - 5 - 5,
                    cy: windowCoordinates.cy - 5 - 5
                };

            if (!infoOnly) {
                // Clamp the width of the menu before grabbing its size
                this.element.css("max-width", 300);
            }

            menuSize = {
                cx: this.element.outerWidth(true),
                cy: this.element.outerHeight(true)
            };

            return { rc: rectangle, menuSize: menuSize };
        },

        _create: function () {
            var popupHolder = $("div.ax-popup-holder");
            var $this = this;
            if (popupHolder.length === 0) {
                popupHolder = $("<div></div>").addClass("ax-popup-holder");
                popupHolder.addClass("ax-pop-hidden");
                if ($("#enroller").length) {
                    $("#enroller").append(popupHolder);
                } else {
                    $("body").append(popupHolder);
                }
            }
            $(this.element).hide();
            popupHolder.append($(this.element));

            if (this.options.closeButton) {
                var closeButton = $("<a></a>").addClass(
                    "ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right"
                );
                closeButton.addClass("ax-pop-close").append("Close");
                var $this = this;
                closeButton.on("click", function () {
                    $this.close();
                });

                if (this.options.isToolTip) {
                    this.element.addClass("has-close");
                }
                this.element.append(closeButton);
            }
            if (this.options.isToolTip) {
                this.element.addClass("ax-tip");
            }

            if (this.options.open) {
                this.open();
            }
        },
        refresh: function () {},
        destroy: function () {
            if (this.removed) {
                return;
            }
            this.removed = true;
            if (this.options.open) {
                this.close();
            }
            if (this.element && this.element.length) {
                this.element.remove();
            }
        },
        open: function () {
            var popupHolder = $("div.ax-popup-holder");
            var $this = this;
            popupHolder.removeClass("ax-pop-hidden");
            popupHolder.find(">*").hide();
            this.options.open = true;
            if (this.options.noOverlay) {
                popupHolder.addClass("no-overlay");
            } else {
                popupHolder.removeClass("no-overlay");
            }
            if (this.options.isToolTip) {
                this.element.css(
                    // find out what the final position should be, accounting for edges
                    this._placementCoords({
                        x: currentMousePos.x,
                        y: currentMousePos.y - 12
                    })
                );

                $("body").append(this.element);
            }
            $(this.element).show();

            if (this.options.closeByClick) {
                // attaching this here will automatically trigger the event.
                setTimeout(function () {
                    $(document).one("click", function (e) {
                        if ($this.options.open) {
                            $this.destroy();
                        }
                    });
                }, 100);
            }
        },
        close: function () {
            var popupHolder = $("div.ax-popup-holder");
            popupHolder.addClass("ax-pop-hidden");
            this.options.open = false;
            $(this.element).hide();
            if (this.options.destroyOnClose) {
                this.destroy();
            }
        }
    });

    $.axWidget("axcelerate.collapsible", {
        options: {},
        _create: function () {
            var $this = this;
            if (window.COLLAPSE) {
                window.COLLAPSE.push($this);
            } else {
                window.COLLAPSE = [$this];
            }
            var element = $(this.element);
            element.addClass("ax-collapse");

            var text;
            if (element) {
                text = element.find(">:first-child");
                if (text.length) {
                    text.addClass("ax-collapse-action");

                    var textHeight = text.outerHeight();

                    if (textHeight === 0) {
                        setTimeout(function () {
                            textHeight = text.outerHeight();
                            if (textHeight > 0) {
                                element.css({
                                    "max-height": textHeight
                                });
                            }
                        }, 1000);
                    }
                    element.css({
                        "max-height": textHeight || "40px",
                        overflow: "hidden"
                    });
                    element.addClass("closed");

                    text.on("click", function () {
                        if (element.hasClass("open")) {
                            element.addClass("closed");
                            element.removeClass("open");

                            element.css({
                                "max-height": textHeight || "40px",
                                overflow: "hidden"
                            });
                        } else {
                            element
                                .addClass("open")
                                .css({ "max-height": "500vh", overflow: "scroll" });
                            element.removeClass("closed");
                        }
                    });
                }
            }
        },
        refresh: function () {},
        destroy: function () {
            if (this.removed) {
                return;
            }
            this.removed = true;
            if (this.element && this.element.length) {
                this.element.remove();
            }
        },
        close: function () {}
    });

    /**
     * Fairly basic. just a custom checkbox with a sliding animation.
     * Likely can simply replace this with a css background transition animation.
     */
    $.axWidget("axcelerate.flipswitch", {
        options: {
            onText: "On",
            offText: "Off",
            changeEventRegistered: false
        },
        _create: function () {
            var $this = this;

            var input = $this.element;
            var hasMarkup = input.parent().hasClass("ax-flip");

            this.options = $.extend(this.options, input.data());

            var labelTextOn, labelTextOff, label, parent;
            if (!hasMarkup) {
                parent = $("<label></label>").addClass("ax-flip");

                labelTextOn = $("<div></div>").addClass("ax-flip-on-text");
                labelTextOff = $("<div></div>").addClass("ax-flip-off-text");
                label = $("<span/>").addClass("text-wrap");
                labelTextOn.text(this.options.onText);
                labelTextOff.text(this.options.offText);
                parent.insertBefore($this.element);
                label.append(labelTextOn).append(labelTextOff);
                parent.append(label).append(input);
            } else {
                parent = input.parent();
                labelTextOn = parent.find(".ax-flip-on-text");
                labelTextOff = parent.find(".ax-flip-off-text");
            }
            if (input.is(":checked")) {
                labelTextOff.hide();
                labelTextOn.show();
                parent.addClass("on").removeClass("off");
            } else {
                labelTextOff.show();
                labelTextOn.hide();
                parent.addClass("off").removeClass("on");
            }
            function onFlipChange(e) {
                $this.options.changeEventRegistered = true;
                if (input.is(":checked")) {
                    labelTextOff.hide();
                    labelTextOn.show();
                    parent.addClass("on").removeClass("off");
                } else {
                    labelTextOff.show();
                    labelTextOn.hide();
                    parent.addClass("off").removeClass("on");
                }
            }
            if ($this.options.changeEventRegistered) {
                // remove listener to prevent doubling up on redraw
                input.off("change", onFlipChange);
                $this.options.changeEventRegistered = false; // This will do nothing
            }

            input.on("change", onFlipChange);
        },
        refresh: function () {
            this._create();
        },
        destroy: function () {
            if (this.removed) {
                return;
            }
            this.removed = true;
            if (this.element && this.element.length) {
                this.element.remove();
            }
        }
    });

    /**
     * Select replacement. Likely can deprecate anything still available and replace with chosen / native
     * @deprecated
     */
    $.axWidget("axcelerate.selectmenu", {
        options: {},
        _create: function () {},
        refresh: function () {},
        destroy: function () {
            if (this.removed) {
                return;
            }

            this.removed = true;
            if (this.element && this.element.length) {
                this.element.remove();
            }
        }
    });

    var defaultFilterCallback = function (index, searchValue) {
        var element,
            text = $.mobile.getAttribute(this, "filtertext");

        if (!text) {
            element = $(this);
            text = element.text();

            if (!text) {
                text = element.val() || "";
            }
        }

        return ("" + text).toLowerCase().indexOf(searchValue) === -1;
    };
    /**
     * search that applies to other content.
     * This one will be interesting.
     */
    $.axWidget("axcelerate.filterable", {
        initSelector: ":data(filter='true')",

        options: {
            filterReveal: false,
            filterCallback: defaultFilterCallback,
            enhanced: false,
            input: null,
            children:
                "> li, > option, > optgroup option, > tbody tr, > .ui-controlgroup > .ui-btn, " +
                "> .ui-controlgroup > .ui-checkbox, > .ui-controlgroup > .ui-radio"
        },

        _create: function () {
            var opts = this.options;
            // by default this won't pick up options in data. add them here.
            if (this.element.data()) {
                this.options = $.extend(this.options, this.element.data());
                opts = this.options;
            }

            $.extend(this, {
                _search: null,
                _timer: 0
            });

            this._setInput(opts.input);
            if (!opts.enhanced) {
                this._filterItems(((this._search && this._search.val()) || "").toLowerCase());
            }
        },

        _onKeyUp: function () {
            var val,
                lastval,
                search = this._search;

            if (search) {
                (val = search.val().toLowerCase()),
                    (lastval = $.mobile.getAttribute(search[0], "lastval") + "");

                if (lastval && lastval === val) {
                    // Execute the handler only once per value change
                    return;
                }

                if (this._timer) {
                    window.clearTimeout(this._timer);
                    this._timer = 0;
                }

                this._timer = this._delay(function () {
                    if (this._trigger("beforefilter", null, { input: search }) === false) {
                        return false;
                    }

                    // Change val as lastval for next execution
                    search[0].setAttribute("data-" + $.mobile.ns + "lastval", val);

                    this._filterItems(val);
                    this._timer = 0;
                }, 250);
            }
        },

        _getFilterableItems: function () {
            var elem = this.element,
                children = this.options.children,
                items = !children
                    ? { length: 0 }
                    : $.isFunction(children)
                    ? children()
                    : children.nodeName
                    ? $(children)
                    : children.jquery
                    ? children
                    : this.element.find(children);

            if (items.length === 0) {
                items = elem.children();
            }

            return items;
        },

        _filterItems: function (val) {
            var idx,
                callback,
                length,
                dst,
                show = [],
                hide = [],
                opts = this.options,
                filterItems = this._getFilterableItems();
            if (val != null) {
                callback = opts.filterCallback || defaultFilterCallback;
                length = filterItems.length;

                // Partition the items into those to be hidden and those to be shown
                for (idx = 0; idx < length; idx++) {
                    dst = callback.call(filterItems[idx], idx, val) ? hide : show;
                    dst.push(filterItems[idx]);
                }
            }

            // If nothing is hidden, then the decision whether to hide or show the items
            // is based on the "filterReveal" option.
            if (hide.length === 0) {
                filterItems[opts.filterReveal && val.length === 0 ? "addClass" : "removeClass"](
                    "ui-screen-hidden"
                );
            } else {
                $(hide).addClass("ui-screen-hidden");
                $(show).removeClass("ui-screen-hidden");
            }

            this._refreshChildWidget();

            this._trigger("filter", null, {
                items: filterItems
            });
        },

        // The Default implementation of _refreshChildWidget attempts to call
        // refresh on collapsibleset, controlgroup, selectmenu, or listview
        _refreshChildWidget: function () {
            var widget,
                idx,
                recognizedWidgets = ["collapsibleset", "selectmenu", "controlgroup", "listview"];

            for (idx = recognizedWidgets.length - 1; idx > -1; idx--) {
                widget = recognizedWidgets[idx];
                if ($[widget]) {
                    widget = this.element.data("axcelerate" + widget);
                    if (widget && $.isFunction(widget.refresh)) {
                        widget.refresh();
                    }
                }
            }
        },

        // TODO: When the input is not internal, do not even store it in this._search
        _setInput: function (selector) {
            var search = this._search;

            // Stop a pending filter operation
            if (this._timer) {
                window.clearTimeout(this._timer);
                this._timer = 0;
            }

            if (search) {
                this._off(search, "keyup keydown keypress change input");
                search = null;
            }

            if (selector) {
                search = selector.jquery
                    ? selector
                    : selector.nodeName
                    ? $(selector)
                    : this.document.find(selector);

                this._on(search, {
                    keydown: "_onKeyDown",
                    keypress: "_onKeyPress",
                    keyup: "_onKeyUp",
                    change: "_onKeyUp",
                    input: "_onKeyUp"
                });
            }

            this._search = search;
        },

        // Prevent form submission
        _onKeyDown: function (event) {
            this._preventKeyPress = false;
            if (event.keyCode === ENTER_KEYCODE) {
                event.preventDefault();
                this._preventKeyPress = true;
            }
        },

        _onKeyPress: function (event) {
            if (this._preventKeyPress) {
                event.preventDefault();
                this._preventKeyPress = false;
            }
        },

        _setOptions: function (options) {
            var refilter = !(
                options.filterReveal === undefined &&
                options.filterCallback === undefined &&
                options.children === undefined
            );

            this._super(options);

            if (options.input !== undefined) {
                this._setInput(options.input);
                refilter = true;
            }

            if (refilter) {
                this.refresh();
            }
        },

        _destroy: function () {
            var opts = this.options,
                items = this._getFilterableItems();

            if (opts.enhanced) {
                items.toggleClass("ui-screen-hidden", opts.filterReveal);
            } else {
                items.removeClass("ui-screen-hidden");
            }
        },

        refresh: function () {
            if (this._timer) {
                window.clearTimeout(this._timer);
                this._timer = 0;
            }
            this._filterItems(((this._search && this._search.val()) || "").toLowerCase());
        }
    });
});
