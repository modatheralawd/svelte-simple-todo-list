
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Todos.svelte generated by Svelte v3.44.0 */

    const file = "src\\components\\Todos.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[26] = list;
    	child_ctx[27] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[24] = list;
    	child_ctx[25] = i;
    	return child_ctx;
    }

    // (86:0) {#if formVisible}
    function create_if_block_2(ctx) {
    	let div;
    	let lable;
    	let t1;
    	let input;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			lable = element("lable");
    			lable.textContent = "TODO Text";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "OK";
    			attr_dev(lable, "for", "todotext");
    			add_location(lable, file, 87, 2, 2073);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "todotext");
    			attr_dev(input, "class", "svelte-188fpxe");
    			add_location(input, file, 88, 2, 2117);
    			attr_dev(button, "class", "ok-btn svelte-188fpxe");
    			add_location(button, file, 89, 2, 2156);
    			attr_dev(div, "id", "newtodo");
    			attr_dev(div, "class", "svelte-188fpxe");
    			add_location(div, file, 86, 1, 2051);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, lable);
    			append_dev(div, t1);
    			append_dev(div, input);
    			append_dev(div, t2);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*addNewTODO*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(86:0) {#if formVisible}",
    		ctx
    	});

    	return block;
    }

    // (119:1) {:else}
    function create_else_block(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_1 = /*filterTODOs*/ ctx[5](/*todoFilter*/ ctx[2], /*todos*/ ctx[0]);
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*todoitem*/ ctx[23].id;
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filterTODOs, todoFilter, todos, saveItem, edit_del_id, delItem, enterEditMode*/ 14389) {
    				each_value_1 = /*filterTODOs*/ ctx[5](/*todoFilter*/ ctx[2], /*todos*/ ctx[0]);
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_1, each_1_anchor, get_each_context_1);
    			}
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(119:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (95:1) {#if !editMode}
    function create_if_block(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value = /*filterTODOs*/ ctx[5](/*todoFilter*/ ctx[2], /*todos*/ ctx[0]);
    	validate_each_argument(each_value);
    	const get_key = ctx => /*todoitem*/ ctx[23].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filterTODOs, todoFilter, todos, delItem, enterEditMode*/ 10277) {
    				each_value = /*filterTODOs*/ ctx[5](/*todoFilter*/ ctx[2], /*todos*/ ctx[0]);
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block, each_1_anchor, get_each_context);
    			}
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(95:1) {#if !editMode}",
    		ctx
    	});

    	return block;
    }

    // (141:3) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let span;
    	let t4_value = /*todoitem*/ ctx[23].text + "";
    	let t4;
    	let t5;
    	let input;
    	let input_id_value;
    	let t6;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[19](/*todoitem*/ ctx[23]);
    	}

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[20](/*todoitem*/ ctx[23]);
    	}

    	function input_change_handler_1() {
    		/*input_change_handler_1*/ ctx[21].call(input, /*each_value_1*/ ctx[26], /*todoitem_index_1*/ ctx[27]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "EDIT";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "DELETE";
    			t3 = space();
    			span = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			attr_dev(button0, "class", "ok-btn svelte-188fpxe");
    			add_location(button0, file, 142, 5, 3322);
    			attr_dev(button1, "class", "ok-btn svelte-188fpxe");
    			set_style(button1, "background", "red");
    			add_location(button1, file, 148, 5, 3450);
    			attr_dev(span, "class", "svelte-188fpxe");
    			add_location(span, file, 155, 5, 3606);
    			attr_dev(input, "id", input_id_value = "c-" + /*todoitem*/ ctx[23].id);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-188fpxe");
    			add_location(input, file, 156, 5, 3641);
    			attr_dev(div, "class", "todo-item svelte-188fpxe");
    			add_location(div, file, 141, 4, 3292);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(div, t3);
    			append_dev(div, span);
    			append_dev(span, t4);
    			append_dev(div, t5);
    			append_dev(div, input);
    			input.checked = /*todoitem*/ ctx[23].done;
    			append_dev(div, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_3, false, false, false),
    					listen_dev(button1, "click", click_handler_4, false, false, false),
    					listen_dev(input, "change", input_change_handler_1)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37 && t4_value !== (t4_value = /*todoitem*/ ctx[23].text + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37 && input_id_value !== (input_id_value = "c-" + /*todoitem*/ ctx[23].id)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37) {
    				input.checked = /*todoitem*/ ctx[23].done;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(141:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (121:3) {#if edit_del_id === todoitem.id}
    function create_if_block_1(ctx) {
    	let div;
    	let button;
    	let t1;
    	let input0;
    	let input0_value_value;
    	let t2;
    	let input1;
    	let input1_id_value;
    	let t3;
    	let mounted;
    	let dispose;

    	function input1_change_handler() {
    		/*input1_change_handler*/ ctx[18].call(input1, /*each_value_1*/ ctx[26], /*todoitem_index_1*/ ctx[27]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "SAVE";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			attr_dev(button, "class", "ok-btn svelte-188fpxe");
    			add_location(button, file, 122, 5, 2950);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "edit-todoitem");
    			input0.value = input0_value_value = /*todoitem*/ ctx[23].text;
    			attr_dev(input0, "class", "svelte-188fpxe");
    			add_location(input0, file, 129, 5, 3064);
    			attr_dev(input1, "id", input1_id_value = "c-" + /*todoitem*/ ctx[23].id);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "svelte-188fpxe");
    			add_location(input1, file, 134, 5, 3160);
    			attr_dev(div, "class", "todo-item svelte-188fpxe");
    			add_location(div, file, 121, 4, 2920);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(div, t1);
    			append_dev(div, input0);
    			append_dev(div, t2);
    			append_dev(div, input1);
    			input1.checked = /*todoitem*/ ctx[23].done;
    			append_dev(div, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler_2*/ ctx[17], false, false, false),
    					listen_dev(input1, "change", input1_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37 && input0_value_value !== (input0_value_value = /*todoitem*/ ctx[23].text) && input0.value !== input0_value_value) {
    				prop_dev(input0, "value", input0_value_value);
    			}

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37 && input1_id_value !== (input1_id_value = "c-" + /*todoitem*/ ctx[23].id)) {
    				attr_dev(input1, "id", input1_id_value);
    			}

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37) {
    				input1.checked = /*todoitem*/ ctx[23].done;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(121:3) {#if edit_del_id === todoitem.id}",
    		ctx
    	});

    	return block;
    }

    // (120:2) {#each filterTODOs(todoFilter, todos) as todoitem (todoitem.id)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*edit_del_id*/ ctx[4] === /*todoitem*/ ctx[23].id) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(120:2) {#each filterTODOs(todoFilter, todos) as todoitem (todoitem.id)}",
    		ctx
    	});

    	return block;
    }

    // (96:2) {#each filterTODOs(todoFilter, todos) as todoitem (todoitem.id)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let span;
    	let t4_value = /*todoitem*/ ctx[23].text + "";
    	let t4;
    	let t5;
    	let input;
    	let input_id_value;
    	let t6;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[14](/*todoitem*/ ctx[23]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[15](/*todoitem*/ ctx[23]);
    	}

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[16].call(input, /*each_value*/ ctx[24], /*todoitem_index*/ ctx[25]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "EDIT";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "DELETE";
    			t3 = space();
    			span = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			attr_dev(button0, "class", "ok-btn svelte-188fpxe");
    			add_location(button0, file, 97, 4, 2373);
    			attr_dev(button1, "class", "ok-btn svelte-188fpxe");
    			set_style(button1, "background", "red");
    			add_location(button1, file, 103, 4, 2495);
    			attr_dev(span, "class", "svelte-188fpxe");
    			add_location(span, file, 110, 4, 2644);
    			attr_dev(input, "id", input_id_value = "c-" + /*todoitem*/ ctx[23].id);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-188fpxe");
    			add_location(input, file, 111, 4, 2678);
    			attr_dev(div, "class", "todo-item svelte-188fpxe");
    			add_location(div, file, 96, 3, 2344);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(div, t3);
    			append_dev(div, span);
    			append_dev(span, t4);
    			append_dev(div, t5);
    			append_dev(div, input);
    			input.checked = /*todoitem*/ ctx[23].done;
    			append_dev(div, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler, false, false, false),
    					listen_dev(button1, "click", click_handler_1, false, false, false),
    					listen_dev(input, "change", input_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37 && t4_value !== (t4_value = /*todoitem*/ ctx[23].text + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37 && input_id_value !== (input_id_value = "c-" + /*todoitem*/ ctx[23].id)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*filterTODOs, todoFilter, todos*/ 37) {
    				input.checked = /*todoitem*/ ctx[23].done;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(96:2) {#each filterTODOs(todoFilter, todos) as todoitem (todoitem.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let h2;
    	let t1;
    	let div0;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let button3;
    	let t9;
    	let t10;
    	let div1;
    	let mounted;
    	let dispose;
    	let if_block0 = /*formVisible*/ ctx[1] && create_if_block_2(ctx);

    	function select_block_type(ctx, dirty) {
    		if (!/*editMode*/ ctx[3]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "TODO Cool List";
    			t1 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "All TODOs";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Done TODOs";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "non-Done TODOs";
    			t7 = space();
    			button3 = element("button");
    			button3.textContent = "Add New TODO";
    			t9 = space();
    			if (if_block0) if_block0.c();
    			t10 = space();
    			div1 = element("div");
    			if_block1.c();
    			attr_dev(h2, "class", "svelte-188fpxe");
    			add_location(h2, file, 78, 0, 1689);
    			attr_dev(button0, "class", "action-btn svelte-188fpxe");
    			add_location(button0, file, 80, 1, 1735);
    			attr_dev(button1, "class", "action-btn svelte-188fpxe");
    			add_location(button1, file, 81, 1, 1803);
    			attr_dev(button2, "class", "action-btn svelte-188fpxe");
    			add_location(button2, file, 82, 1, 1873);
    			attr_dev(button3, "class", "ok-btn svelte-188fpxe");
    			add_location(button3, file, 83, 1, 1950);
    			attr_dev(div0, "id", "navbtns");
    			attr_dev(div0, "class", "svelte-188fpxe");
    			add_location(div0, file, 79, 0, 1714);
    			attr_dev(div1, "id", "todos-main");
    			attr_dev(div1, "class", "svelte-188fpxe");
    			add_location(div1, file, 93, 0, 2232);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(div0, t5);
    			append_dev(div0, button2);
    			append_dev(div0, t7);
    			append_dev(div0, button3);
    			insert_dev(target, t9, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, div1, anchor);
    			if_block1.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*allTODOs*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*doneTODOs*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*nonDoneTODOs*/ ctx[8], false, false, false),
    					listen_dev(button3, "click", /*showNewTODOForm*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*formVisible*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t10.parentNode, t10);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t9);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(div1);
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Todos', slots, []);
    	let { todos = [] } = $$props;

    	// let temptodos;
    	let formVisible = false;

    	let todoFilter = "all";
    	let editMode = false;
    	let edit_del_id;

    	const filterTODOs = (todoFilter, todos) => todoFilter === "done"
    	? todos.filter(item => item.done == true)
    	: todoFilter === "nondone"
    		? todos.filter(item => item.done == false)
    		: todos;

    	// $: {
    	// 	if (filterTODOs(todoFilter, todos).length === 0)
    	// 		document.getElementById("todos-main").innerText =
    	// 			"NO TODOs NOW ...";
    	// }
    	const allTODOs = () => {
    		$$invalidate(2, todoFilter = "all");
    	};

    	const doneTODOs = () => {
    		$$invalidate(2, todoFilter = "done");
    	};

    	const nonDoneTODOs = () => {
    		$$invalidate(2, todoFilter = "nondone");
    	};

    	const showNewTODOForm = () => {
    		$$invalidate(1, formVisible = true);
    	};

    	const addNewTODO = () => {
    		$$invalidate(0, todos = [
    			...todos,
    			{
    				id: "hash-" + new Date(),
    				text: document.getElementById("todotext").value,
    				done: false
    			}
    		]);

    		$$invalidate(1, formVisible = false);
    	};

    	const enterEditMode = id => {
    		$$invalidate(3, editMode = true);
    		$$invalidate(4, edit_del_id = id);
    	};

    	const exitEditMode = () => {
    		$$invalidate(3, editMode = false);
    	};

    	const saveItem = () => {
    		let ele = document.getElementById("edit-todoitem");

    		todos.forEach(item => {
    			if (item.id === edit_del_id) item.text = ele.value;
    		});

    		$$invalidate(3, editMode = false);
    	};

    	const delItem = id => {
    		if (confirm("ARE YOU SURE ???")) $$invalidate(0, todos = todos.filter(item => item.id !== id));
    	};

    	const writable_props = ['todos'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Todos> was created with unknown prop '${key}'`);
    	});

    	const click_handler = todoitem => {
    		enterEditMode(todoitem.id);
    	};

    	const click_handler_1 = todoitem => {
    		delItem(todoitem.id);
    	};

    	function input_change_handler(each_value, todoitem_index) {
    		each_value[todoitem_index].done = this.checked;
    		$$invalidate(5, filterTODOs);
    		$$invalidate(2, todoFilter);
    		$$invalidate(0, todos);
    	}

    	const click_handler_2 = () => {
    		saveItem();
    	};

    	function input1_change_handler(each_value_1, todoitem_index_1) {
    		each_value_1[todoitem_index_1].done = this.checked;
    		$$invalidate(5, filterTODOs);
    		$$invalidate(2, todoFilter);
    		$$invalidate(0, todos);
    	}

    	const click_handler_3 = todoitem => {
    		enterEditMode(todoitem.id);
    	};

    	const click_handler_4 = todoitem => {
    		delItem(todoitem.id);
    	};

    	function input_change_handler_1(each_value_1, todoitem_index_1) {
    		each_value_1[todoitem_index_1].done = this.checked;
    		$$invalidate(5, filterTODOs);
    		$$invalidate(2, todoFilter);
    		$$invalidate(0, todos);
    	}

    	$$self.$$set = $$props => {
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    	};

    	$$self.$capture_state = () => ({
    		todos,
    		formVisible,
    		todoFilter,
    		editMode,
    		edit_del_id,
    		filterTODOs,
    		allTODOs,
    		doneTODOs,
    		nonDoneTODOs,
    		showNewTODOForm,
    		addNewTODO,
    		enterEditMode,
    		exitEditMode,
    		saveItem,
    		delItem
    	});

    	$$self.$inject_state = $$props => {
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    		if ('formVisible' in $$props) $$invalidate(1, formVisible = $$props.formVisible);
    		if ('todoFilter' in $$props) $$invalidate(2, todoFilter = $$props.todoFilter);
    		if ('editMode' in $$props) $$invalidate(3, editMode = $$props.editMode);
    		if ('edit_del_id' in $$props) $$invalidate(4, edit_del_id = $$props.edit_del_id);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todos,
    		formVisible,
    		todoFilter,
    		editMode,
    		edit_del_id,
    		filterTODOs,
    		allTODOs,
    		doneTODOs,
    		nonDoneTODOs,
    		showNewTODOForm,
    		addNewTODO,
    		enterEditMode,
    		saveItem,
    		delItem,
    		click_handler,
    		click_handler_1,
    		input_change_handler,
    		click_handler_2,
    		input1_change_handler,
    		click_handler_3,
    		click_handler_4,
    		input_change_handler_1
    	];
    }

    class Todos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { todos: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todos",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get todos() {
    		throw new Error("<Todos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todos(value) {
    		throw new Error("<Todos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.44.0 */

    function create_fragment(ctx) {
    	let todos_1;
    	let current;

    	todos_1 = new Todos({
    			props: { todos: /*todos*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(todos_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(todos_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todos_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todos_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todos_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	let todos = [
    		{
    			id: 1,
    			text: "go to university",
    			done: true
    		},
    		{
    			id: 2,
    			text: "go to school of khartoum ",
    			done: false
    		},
    		{
    			id: 3,
    			text: "holding up , and do nothing ",
    			done: true
    		}
    	];

    	let counterssum = 0;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Todos, todos, counterssum });

    	$$self.$inject_state = $$props => {
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    		if ('counterssum' in $$props) counterssum = $$props.counterssum;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [todos];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
