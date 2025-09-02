import * as IRF from 'internet-roadtrip-framework'
import styles, {stylesheet} from './settings.module.css'
import { render, Show } from "solid-js/web";
import { createEffect, createSignal, For, on } from "solid-js";

// Wrapper around IRF panel
class Section {
    name: string;
    description: string | undefined;
    container: HTMLDivElement;
    settings;

    constructor (name: string, settings, description?: string) {
        this.name = name;
        this.settings = settings;
        this.description = description;
        this.container = document.createElement("div");
        this.render_header();
    }

    render_header() {
        this.container.classList.add(styles['settings-section']);
        const item = 
        <>
            <hr></hr>
            <h2>{this.name}</h2>
            <Show when={this.description}><p innerHTML={this.description} /></Show>
        </>
        render(() => item, this.container);
    }

    add_checkbox(
        name: string, identifier: string,
        callback: CallableFunction=undefined
    ) {
        const item =
        <div class={styles['settings-item']}>
            <span class={styles['setting']}>{name}</span>
            <hr />
            <div class={styles['setting']}>
                <input
                    type="checkbox"
                    checked={this.settings[identifier]}
                    class={IRF.ui.panel.styles.toggle}
                    onChange={(e) => {
                        this.settings[identifier] = e.currentTarget.checked;
                        GM.setValues(this.settings);
                        if (callback) callback(e.currentTarget.checked);
                    }}
                />
            </div>
        </div>

        render(() => item, this.container);
    }

    add_slider(
        name: string, identifier: string, callback: CallableFunction=undefined,
        slider_bits: [number, number, number]=[1, 17, .5]
    ) {
        const [value, setValue] = createSignal(this.settings[identifier]);

        createEffect(on(value, () => {
            this.settings[identifier] = value();
            GM.setValues(this.settings);
            if (callback) callback(value());
        }, {defer: true}))

        const item =
        <div class={styles['settings-item-margin']}>
            <div class={styles['setting']}>
                <label> {name}: {value()}</label>
                <input
                    type="range"
                    min={slider_bits[0]}
                    max={slider_bits[1]}
                    step={slider_bits[2]}
                    value={value()}
                    class={IRF.ui.panel.styles.slider}
                    oninput={(e) => setValue(e.target.value)}
                />
            </div>
        </div>

        render(() => item, this.container);
    }

    add_button(
        name: string, callback: CallableFunction
    ) {
        const item =
        <div class={[styles['settings-item'], styles['inverse']].join(' ')}>
            <hr />
            <div class={styles['setting']}>
                <button
                    onclick={() => callback()}
                >{name}</button>
            </div>
            <hr />
        </div>

        render(() => item, this.container);
    }

    add_input(
        name:string, identifier: string, type: string,
        callback?: CallableFunction,
        default_value?: unknown
    ) {
        const [value, setValue] = createSignal(this.settings[identifier]);

        // We use on with defer here so the effect only runs when value changes
        // and not when the effect is initially created
        createEffect(on(value, () => {
            this.settings[identifier] = value();
            GM.setValues(this.settings);
            if (callback) callback(value());
        }, {defer: true}));

        const item =
        <div class={styles['settings-item']}>
            <span class={styles['setting']}>{name}:</span>
            <input
                style="width: 100%;"
                type={type}
                value={value()}
                onchange={(e) => setValue(e.target.value)}
            />
            <Show when={default_value}>
                <button
                    class={styles['setting']}
                    onclick={() => setValue(default_value)}
                >Reset</button>
            </Show>
        </div>
        render(() => item, this.container);
    }

    add_dropdown(
        name:string, identifier: string,
        values: [string, string][],
        callback?: CallableFunction,
        default_value?: unknown
    ) {
        const [value, setValue] = createSignal(this.settings[identifier]);

        // We use on with defer here so the effect only runs when value changes
        // and not when the effect is initially created
        createEffect(on(value, () => {
            this.settings[identifier] = value();
            GM.setValues(this.settings);
            if (callback) callback(value());
        }, {defer: true}));

        const item =
        <div class={styles['settings-item']}>
            <span class={styles['setting']}>{name}:</span>
            <select
                style="width: 100%;"
                onchange={(e) => setValue(e.target.value)}
            >
                <For each={values}>
                    {(item, index) => (
                        <option
                            value={item[1]}
                            selected={item[1] == this.settings[identifier]}
                        >{ item[0] }</option>
                    )}
                </For>
            </select>
            <Show when={default_value}>
                <button
                    class={styles['setting']}
                    onclick={() => setValue(default_value)}
                >Reset</button>
            </Show>
        </div>
        render(() => item, this.container);
    }

    add_comment(text: string) {
        const item = 
        <div class={styles['settings-item-margin']}>
            <p
                class={styles['setting']}
                innerHTML={text}
            />
        </div>
        render(() => item, this.container);
    }

    add_wide_comment(text: string) {
        const item = <p innerHTML={text} />
        render(() => item, this.container);
    }
}

export class Panel extends Section {
    _irf_settings: {
        container: HTMLDivElement;
    }

    constructor(name: string, settings, gm_info) {
        super(name, settings);
        this._irf_settings = IRF.ui.panel.createTabFor(
            gm_info, {
                tabName: name,
                style: stylesheet
            }
        );
        this.container = this._irf_settings.container;
    }

    render_header(): void {
        
    }

    add_section(name: string, description?: string): Section {
        const section = new Section(name, this.settings, description);
        this.container.appendChild(section.container);
        return section;
    }
}