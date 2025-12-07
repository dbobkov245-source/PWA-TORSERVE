# PWA-TorServe Full Project Code

## 📺 О проекте

**PWA-TorServe** — self-hosted стриминговый сервис для Android TV и мобильных устройств.

### Возможности:
- 🚀 **Мгновенный стриминг** — воспроизведение торрентов без полного скачивания
- 📱 **Native Android Bridge** — запуск Vimu/VLC/MX Player из веб-интерфейса
- 🔍 **Jacred поиск** — интеграция с jacred.xyz (как в Lampa)
- 🏷️ **Категории** — автоматическая сортировка: Фильмы/Сериалы/Музыка
- 📺 **Play All** — плейлисты для сериалов
- 🛡️ **Self-Healing Watchdog** — автовосстановление при проблемах

### Архитектура:
- **Сервер**: Node.js + Express + torrent-stream (Docker на Synology NAS)
- **Клиент**: React + Capacitor (Android APK)
- **Плееры**: Vimu Player, VLC, MX Player

---

Generated: 2025-12-07T16:21:27+03:00

## Files


import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("com.getcapacitor.app", appContext.getPackageName());
    }
}
\n```\n\n### client/android/app/src/main/assets/capacitor.config.json\n\n```json\n{
	"appId": "com.torserve.pwa",
	"appName": "PWA-TorServe",
	"webDir": "dist",
	"server": {
		"androidScheme": "https",
		"cleartext": true,
		"allowNavigation": [
			"192.168.1.70",
			"192.168.1.*",
			"*"
		]
	},
	"android": {
		"allowMixedContent": true
	}
}
\n```\n\n### client/android/app/src/main/assets/capacitor.plugins.json\n\n```json\n[
	{
		"pkg": "@capacitor/app",
		"classpath": "com.capacitorjs.plugins.app.AppPlugin"
	},
	{
		"pkg": "@capacitor/browser",
		"classpath": "com.capacitorjs.plugins.browser.BrowserPlugin"
	}
]
\n```\n\n### client/android/app/src/main/assets/public/assets/index-CFpMfkH4.css\n\n```css\n@layer properties{@supports ((-webkit-hyphens:none) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-space-y-reverse:0;--tw-border-style:solid;--tw-gradient-position:initial;--tw-gradient-from:#0000;--tw-gradient-via:#0000;--tw-gradient-to:#0000;--tw-gradient-stops:initial;--tw-gradient-via-stops:initial;--tw-gradient-from-position:0%;--tw-gradient-via-position:50%;--tw-gradient-to-position:100%;--tw-leading:initial;--tw-font-weight:initial;--tw-tracking:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial;--tw-duration:initial;--tw-scale-x:1;--tw-scale-y:1;--tw-scale-z:1}}}@layer theme{:root,:host{--font-sans:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";--font-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;--color-red-200:oklch(88.5% .062 18.334);--color-red-400:oklch(70.4% .191 22.216);--color-red-500:oklch(63.7% .237 25.331);--color-red-600:oklch(57.7% .245 27.325);--color-red-700:oklch(50.5% .213 27.518);--color-red-800:oklch(44.4% .177 26.899);--color-red-900:oklch(39.6% .141 25.723);--color-yellow-100:oklch(97.3% .071 103.193);--color-yellow-400:oklch(85.2% .199 91.936);--color-yellow-500:oklch(79.5% .184 86.047);--color-yellow-600:oklch(68.1% .162 75.834);--color-green-400:oklch(79.2% .209 151.711);--color-green-500:oklch(72.3% .219 149.579);--color-green-600:oklch(62.7% .194 149.214);--color-green-700:oklch(52.7% .154 150.069);--color-blue-400:oklch(70.7% .165 254.624);--color-blue-500:oklch(62.3% .214 259.815);--color-blue-600:oklch(54.6% .245 262.881);--color-blue-700:oklch(48.8% .243 264.376);--color-blue-900:oklch(37.9% .146 265.522);--color-purple-400:oklch(71.4% .203 305.504);--color-purple-500:oklch(62.7% .265 303.9);--color-purple-600:oklch(55.8% .288 302.321);--color-purple-700:oklch(49.6% .265 301.924);--color-gray-100:oklch(96.7% .003 264.542);--color-gray-200:oklch(92.8% .006 264.531);--color-gray-300:oklch(87.2% .01 258.338);--color-gray-400:oklch(70.7% .022 261.325);--color-gray-500:oklch(55.1% .027 264.364);--color-gray-600:oklch(44.6% .03 256.802);--color-gray-700:oklch(37.3% .034 259.733);--color-gray-800:oklch(27.8% .033 256.848);--color-gray-900:oklch(21% .034 264.665);--color-black:#000;--color-white:#fff;--spacing:.25rem;--container-md:28rem;--container-lg:32rem;--text-xs:.75rem;--text-xs--line-height:calc(1/.75);--text-sm:.875rem;--text-sm--line-height:calc(1.25/.875);--text-lg:1.125rem;--text-lg--line-height:calc(1.75/1.125);--text-xl:1.25rem;--text-xl--line-height:calc(1.75/1.25);--text-2xl:1.5rem;--text-2xl--line-height:calc(2/1.5);--text-6xl:3.75rem;--text-6xl--line-height:1;--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--font-weight-black:900;--tracking-wide:.025em;--tracking-wider:.05em;--leading-tight:1.25;--leading-snug:1.375;--radius-lg:.5rem;--radius-xl:.75rem;--radius-2xl:1rem;--drop-shadow-lg:0 4px 4px #00000026;--animate-pulse:pulse 2s cubic-bezier(.4,0,.6,1)infinite;--blur-sm:8px;--blur-md:12px;--blur-xl:24px;--blur-2xl:40px;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4,0,.2,1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono)}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;line-height:1.5;font-family:var(--default-font-family,ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring{outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::-moz-placeholder{opacity:1}::placeholder{opacity:1}@supports (not (-webkit-appearance:-apple-pay-button)) or (contain-intrinsic-size:1px){::-moz-placeholder{color:currentColor}::placeholder{color:currentColor}@supports (color:color-mix(in lab,red,red)){::-moz-placeholder{color:color-mix(in oklab,currentcolor 50%,transparent)}::placeholder{color:color-mix(in oklab,currentcolor 50%,transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){-webkit-appearance:button;-moz-appearance:button;appearance:button}::file-selector-button{-webkit-appearance:button;-moz-appearance:button;appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.pointer-events-none{pointer-events:none}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.static{position:static}.sticky{position:sticky}.inset-0{inset:calc(var(--spacing)*0)}.-top-10{top:calc(var(--spacing)*-10)}.top-0{top:calc(var(--spacing)*0)}.top-2{top:calc(var(--spacing)*2)}.top-4{top:calc(var(--spacing)*4)}.-right-10{right:calc(var(--spacing)*-10)}.right-2{right:calc(var(--spacing)*2)}.right-4{right:calc(var(--spacing)*4)}.bottom-10{bottom:calc(var(--spacing)*10)}.-left-10{left:calc(var(--spacing)*-10)}.z-20{z-index:20}.z-30{z-index:30}.z-50{z-index:50}.col-span-full{grid-column:1/-1}.-mx-1{margin-inline:calc(var(--spacing)*-1)}.mx-4{margin-inline:calc(var(--spacing)*4)}.mx-6{margin-inline:calc(var(--spacing)*6)}.mx-auto{margin-inline:auto}.mt-1{margin-top:calc(var(--spacing)*1)}.mt-3{margin-top:calc(var(--spacing)*3)}.mt-4{margin-top:calc(var(--spacing)*4)}.mt-6{margin-top:calc(var(--spacing)*6)}.mt-auto{margin-top:auto}.mb-2{margin-bottom:calc(var(--spacing)*2)}.mb-3{margin-bottom:calc(var(--spacing)*3)}.mb-4{margin-bottom:calc(var(--spacing)*4)}.mb-6{margin-bottom:calc(var(--spacing)*6)}.mb-8{margin-bottom:calc(var(--spacing)*8)}.ml-2{margin-left:calc(var(--spacing)*2)}.ml-3{margin-left:calc(var(--spacing)*3)}.line-clamp-2{-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.line-clamp-4{-webkit-line-clamp:4;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.block{display:block}.flex{display:flex}.grid{display:grid}.aspect-\[2\/3\]{aspect-ratio:2/3}.h-1{height:calc(var(--spacing)*1)}.h-2{height:calc(var(--spacing)*2)}.h-3{height:calc(var(--spacing)*3)}.h-24{height:calc(var(--spacing)*24)}.h-32{height:calc(var(--spacing)*32)}.h-full{height:100%}.max-h-64{max-height:calc(var(--spacing)*64)}.min-h-screen{min-height:100vh}.w-3{width:calc(var(--spacing)*3)}.w-24{width:calc(var(--spacing)*24)}.w-32{width:calc(var(--spacing)*32)}.w-48{width:calc(var(--spacing)*48)}.w-full{width:100%}.max-w-lg{max-width:var(--container-lg)}.max-w-md{max-width:var(--container-md)}.min-w-0{min-width:calc(var(--spacing)*0)}.flex-1{flex:1}.scale-\[1\.02\]{scale:1.02}.animate-pulse{animation:var(--animate-pulse)}.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.flex-col{flex-direction:column}.items-center{align-items:center}.items-end{align-items:flex-end}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-1{gap:calc(var(--spacing)*1)}.gap-2{gap:calc(var(--spacing)*2)}.gap-3{gap:calc(var(--spacing)*3)}.gap-4{gap:calc(var(--spacing)*4)}:where(.space-y-2>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing)*2)*var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing)*2)*calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-3>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing)*3)*var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing)*3)*calc(1 - var(--tw-space-y-reverse)))}.self-center{align-self:center}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.rounded{border-radius:.25rem}.rounded-2xl{border-radius:var(--radius-2xl)}.rounded-full{border-radius:3.40282e38px}.rounded-lg{border-radius:var(--radius-lg)}.rounded-xl{border-radius:var(--radius-xl)}.border{border-style:var(--tw-border-style);border-width:1px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-l-2{border-left-style:var(--tw-border-style);border-left-width:2px}.border-blue-500{border-color:var(--color-blue-500)}.border-gray-600{border-color:var(--color-gray-600)}.border-gray-700{border-color:var(--color-gray-700)}.border-gray-800{border-color:var(--color-gray-800)}.border-purple-600\/50{border-color:#9810fa80}@supports (color:color-mix(in lab,red,red)){.border-purple-600\/50{border-color:color-mix(in oklab,var(--color-purple-600)50%,transparent)}}.border-red-700{border-color:var(--color-red-700)}.border-red-800{border-color:var(--color-red-800)}.border-yellow-500{border-color:var(--color-yellow-500)}.bg-\[\#141414\]{background-color:#141414}.bg-\[\#141414\]\/90{background-color:#141414e6}.bg-\[\#181818\]{background-color:#181818}.bg-black\/20{background-color:#0003}@supports (color:color-mix(in lab,red,red)){.bg-black\/20{background-color:color-mix(in oklab,var(--color-black)20%,transparent)}}.bg-black\/40{background-color:#0006}@supports (color:color-mix(in lab,red,red)){.bg-black\/40{background-color:color-mix(in oklab,var(--color-black)40%,transparent)}}.bg-black\/80{background-color:#000c}@supports (color:color-mix(in lab,red,red)){.bg-black\/80{background-color:color-mix(in oklab,var(--color-black)80%,transparent)}}.bg-black\/90{background-color:#000000e6}@supports (color:color-mix(in lab,red,red)){.bg-black\/90{background-color:color-mix(in oklab,var(--color-black)90%,transparent)}}.bg-blue-500{background-color:var(--color-blue-500)}.bg-blue-600{background-color:var(--color-blue-600)}.bg-gray-700{background-color:var(--color-gray-700)}.bg-gray-800{background-color:var(--color-gray-800)}.bg-gray-800\/50{background-color:#1e293980}@supports (color:color-mix(in lab,red,red)){.bg-gray-800\/50{background-color:color-mix(in oklab,var(--color-gray-800)50%,transparent)}}.bg-gray-900{background-color:var(--color-gray-900)}.bg-green-500{background-color:var(--color-green-500)}.bg-green-600{background-color:var(--color-green-600)}.bg-purple-600{background-color:var(--color-purple-600)}.bg-red-600{background-color:var(--color-red-600)}.bg-red-900\/30{background-color:#82181a4d}@supports (color:color-mix(in lab,red,red)){.bg-red-900\/30{background-color:color-mix(in oklab,var(--color-red-900)30%,transparent)}}.bg-red-900\/50{background-color:#82181a80}@supports (color:color-mix(in lab,red,red)){.bg-red-900\/50{background-color:color-mix(in oklab,var(--color-red-900)50%,transparent)}}.bg-white{background-color:var(--color-white)}.bg-white\/5{background-color:#ffffff0d}@supports (color:color-mix(in lab,red,red)){.bg-white\/5{background-color:color-mix(in oklab,var(--color-white)5%,transparent)}}.bg-yellow-500{background-color:var(--color-yellow-500)}.bg-yellow-600\/90{background-color:#cd8900e6}@supports (color:color-mix(in lab,red,red)){.bg-yellow-600\/90{background-color:color-mix(in oklab,var(--color-yellow-600)90%,transparent)}}.bg-gradient-to-br{--tw-gradient-position:to bottom right in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}.bg-gradient-to-r{--tw-gradient-position:to right in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}.bg-gradient-to-t{--tw-gradient-position:to top in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}.from-black\/90{--tw-gradient-from:#000000e6}@supports (color:color-mix(in lab,red,red)){.from-black\/90{--tw-gradient-from:color-mix(in oklab,var(--color-black)90%,transparent)}}.from-black\/90{--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-to)var(--tw-gradient-to-position))}.from-blue-500{--tw-gradient-from:var(--color-blue-500);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-to)var(--tw-gradient-to-position))}.from-blue-900{--tw-gradient-from:var(--color-blue-900);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-to)var(--tw-gradient-to-position))}.via-transparent{--tw-gradient-via:transparent;--tw-gradient-via-stops:var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-via)var(--tw-gradient-via-position),var(--tw-gradient-to)var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-via-stops)}.to-black\/10{--tw-gradient-to:#0000001a}@supports (color:color-mix(in lab,red,red)){.to-black\/10{--tw-gradient-to:color-mix(in oklab,var(--color-black)10%,transparent)}}.to-black\/10{--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-to)var(--tw-gradient-to-position))}.to-gray-900{--tw-gradient-to:var(--color-gray-900);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-to)var(--tw-gradient-to-position))}.to-purple-500{--tw-gradient-to:var(--color-purple-500);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position),var(--tw-gradient-from)var(--tw-gradient-from-position),var(--tw-gradient-to)var(--tw-gradient-to-position))}.bg-clip-text{-webkit-background-clip:text;background-clip:text}.object-cover{-o-object-fit:cover;object-fit:cover}.p-2{padding:calc(var(--spacing)*2)}.p-3{padding:calc(var(--spacing)*3)}.p-4{padding:calc(var(--spacing)*4)}.p-6{padding:calc(var(--spacing)*6)}.p-8{padding:calc(var(--spacing)*8)}.px-1{padding-inline:calc(var(--spacing)*1)}.px-2{padding-inline:calc(var(--spacing)*2)}.px-3{padding-inline:calc(var(--spacing)*3)}.px-4{padding-inline:calc(var(--spacing)*4)}.px-6{padding-inline:calc(var(--spacing)*6)}.py-0\.5{padding-block:calc(var(--spacing)*.5)}.py-1{padding-block:calc(var(--spacing)*1)}.py-1\.5{padding-block:calc(var(--spacing)*1.5)}.py-2{padding-block:calc(var(--spacing)*2)}.py-3{padding-block:calc(var(--spacing)*3)}.py-4{padding-block:calc(var(--spacing)*4)}.py-20{padding-block:calc(var(--spacing)*20)}.pt-1{padding-top:calc(var(--spacing)*1)}.pt-4{padding-top:calc(var(--spacing)*4)}.pb-3{padding-bottom:calc(var(--spacing)*3)}.pb-20{padding-bottom:calc(var(--spacing)*20)}.pl-3{padding-left:calc(var(--spacing)*3)}.text-center{text-align:center}.text-left{text-align:left}.font-mono{font-family:var(--font-mono)}.font-sans{font-family:var(--font-sans)}.text-2xl{font-size:var(--text-2xl);line-height:var(--tw-leading,var(--text-2xl--line-height))}.text-6xl{font-size:var(--text-6xl);line-height:var(--tw-leading,var(--text-6xl--line-height))}.text-lg{font-size:var(--text-lg);line-height:var(--tw-leading,var(--text-lg--line-height))}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xl{font-size:var(--text-xl);line-height:var(--tw-leading,var(--text-xl--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.text-\[10px\]{font-size:10px}.leading-snug{--tw-leading:var(--leading-snug);line-height:var(--leading-snug)}.leading-tight{--tw-leading:var(--leading-tight);line-height:var(--leading-tight)}.font-black{--tw-font-weight:var(--font-weight-black);font-weight:var(--font-weight-black)}.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.tracking-wide{--tw-tracking:var(--tracking-wide);letter-spacing:var(--tracking-wide)}.tracking-wider{--tw-tracking:var(--tracking-wider);letter-spacing:var(--tracking-wider)}.break-all{word-break:break-all}.whitespace-nowrap{white-space:nowrap}.text-black{color:var(--color-black)}.text-gray-100{color:var(--color-gray-100)}.text-gray-200{color:var(--color-gray-200)}.text-gray-300{color:var(--color-gray-300)}.text-gray-400{color:var(--color-gray-400)}.text-gray-500{color:var(--color-gray-500)}.text-gray-600{color:var(--color-gray-600)}.text-green-400{color:var(--color-green-400)}.text-purple-400{color:var(--color-purple-400)}.text-red-200{color:var(--color-red-200)}.text-red-400{color:var(--color-red-400)}.text-transparent{color:#0000}.text-white{color:var(--color-white)}.text-yellow-100{color:var(--color-yellow-100)}.opacity-75{opacity:.75}.opacity-90{opacity:.9}.shadow-2xl{--tw-shadow:0 25px 50px -12px var(--tw-shadow-color,#00000040);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px var(--tw-shadow-color,#0000001a),0 4px 6px -4px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a),0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-xl{--tw-shadow:0 20px 25px -5px var(--tw-shadow-color,#0000001a),0 8px 10px -6px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-black{--tw-shadow-color:#000}@supports (color:color-mix(in lab,red,red)){.shadow-black{--tw-shadow-color:color-mix(in oklab,var(--color-black)var(--tw-shadow-alpha),transparent)}}.blur-2xl{--tw-blur:blur(var(--blur-2xl));filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.blur-xl{--tw-blur:blur(var(--blur-xl));filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.drop-shadow-lg{--tw-drop-shadow-size:drop-shadow(0 4px 4px var(--tw-drop-shadow-color,#00000026));--tw-drop-shadow:drop-shadow(var(--drop-shadow-lg));filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.backdrop-blur-md{--tw-backdrop-blur:blur(var(--blur-md));-webkit-backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,)}.backdrop-blur-sm{--tw-backdrop-blur:blur(var(--blur-sm));-webkit-backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,)}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-opacity{transition-property:opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-300{--tw-duration:.3s;transition-duration:.3s}.duration-500{--tw-duration:.5s;transition-duration:.5s}.outline-none{--tw-outline-style:none;outline-style:none}.selection\:bg-red-500 ::-moz-selection{background-color:var(--color-red-500)}.selection\:bg-red-500 ::selection{background-color:var(--color-red-500)}.selection\:bg-red-500::-moz-selection{background-color:var(--color-red-500)}.selection\:bg-red-500::selection{background-color:var(--color-red-500)}.selection\:text-white ::-moz-selection{color:var(--color-white)}.selection\:text-white ::selection{color:var(--color-white)}.selection\:text-white::-moz-selection{color:var(--color-white)}.selection\:text-white::selection{color:var(--color-white)}@media(hover:hover){.hover\:scale-105:hover{--tw-scale-x:105%;--tw-scale-y:105%;--tw-scale-z:105%;scale:var(--tw-scale-x)var(--tw-scale-y)}.hover\:bg-black\/60:hover{background-color:#0009}@supports (color:color-mix(in lab,red,red)){.hover\:bg-black\/60:hover{background-color:color-mix(in oklab,var(--color-black)60%,transparent)}}.hover\:bg-blue-700:hover{background-color:var(--color-blue-700)}.hover\:bg-gray-200:hover{background-color:var(--color-gray-200)}.hover\:bg-gray-700:hover{background-color:var(--color-gray-700)}.hover\:bg-gray-800:hover{background-color:var(--color-gray-800)}.hover\:bg-green-700:hover{background-color:var(--color-green-700)}.hover\:bg-purple-700:hover{background-color:var(--color-purple-700)}.hover\:bg-red-700:hover{background-color:var(--color-red-700)}.hover\:bg-red-900\/20:hover{background-color:#82181a33}@supports (color:color-mix(in lab,red,red)){.hover\:bg-red-900\/20:hover{background-color:color-mix(in oklab,var(--color-red-900)20%,transparent)}}.hover\:text-white:hover{color:var(--color-white)}}.focus\:z-20:focus{z-index:20}.focus\:scale-105:focus{--tw-scale-x:105%;--tw-scale-y:105%;--tw-scale-z:105%;scale:var(--tw-scale-x)var(--tw-scale-y)}.focus\:border-blue-500:focus{border-color:var(--color-blue-500)}.focus\:bg-blue-500:focus{background-color:var(--color-blue-500)}.focus\:bg-yellow-400:focus{background-color:var(--color-yellow-400)}.focus\:ring-2:focus{--tw-ring-shadow:var(--tw-ring-inset,)0 0 0 calc(2px + var(--tw-ring-offset-width))var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.focus\:ring-4:focus{--tw-ring-shadow:var(--tw-ring-inset,)0 0 0 calc(4px + var(--tw-ring-offset-width))var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.focus\:ring-blue-400:focus{--tw-ring-color:var(--color-blue-400)}.focus\:ring-blue-500:focus{--tw-ring-color:var(--color-blue-500)}.focus\:ring-purple-500:focus{--tw-ring-color:var(--color-purple-500)}.focus\:ring-offset-2:focus{--tw-ring-offset-width:2px;--tw-ring-offset-shadow:var(--tw-ring-inset,)0 0 0 var(--tw-ring-offset-width)var(--tw-ring-offset-color)}.focus\:ring-offset-\[\#141414\]:focus{--tw-ring-offset-color:#141414}.focus\:outline-none:focus{--tw-outline-style:none;outline-style:none}.disabled\:opacity-50:disabled{opacity:.5}@media(min-width:48rem){.md\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.md\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(min-width:64rem){.lg\:grid-cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}}}html,body{width:100%;max-width:100vw;overflow-x:hidden}#root{width:100%;min-height:100vh;overflow-x:hidden}:focus{outline:none}.tv-focusable:focus,.tv-card:focus,button:focus,[tabindex]:focus{outline:none;transition:all .15s ease-out;transform:scale(1.02);box-shadow:0 0 0 4px #3b82f6cc}.tv-card{cursor:pointer;transition:all .2s ease-out}.tv-card:focus{z-index:10;position:relative;transform:scale(1.08);box-shadow:0 0 0 4px #fff,0 8px 30px #00000080}.tv-card:hover{transform:scale(1.05)}.tv-btn-primary:focus{transform:scale(1.05);box-shadow:0 0 0 4px #22c55ecc,0 4px 20px #22c55e66}.tv-btn-danger:focus{box-shadow:0 0 0 4px #ef4444cc}.netflix-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.5rem;padding:1rem;display:grid}@media(min-width:1280px){.netflix-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:2rem;padding:2rem}}.torrent-card{aspect-ratio:16/10;background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid #0000;border-radius:12px;flex-direction:column;justify-content:space-between;padding:1.25rem;display:flex;position:relative;overflow:hidden}.torrent-card:before{content:"";opacity:0;background:linear-gradient(90deg,#3b82f6,#8b5cf6);height:4px;transition:opacity .2s;position:absolute;top:0;left:0;right:0}.torrent-card:focus:before,.torrent-card:hover:before{opacity:1}.torrent-card-title{-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;font-size:1.25rem;font-weight:600;line-height:1.3;display:-webkit-box;overflow:hidden}.torrent-card-status{color:#94a3b8;align-items:center;gap:.75rem;font-size:.875rem;display:flex}.torrent-card-progress{background:#334155;border-radius:3px;height:6px;margin-top:.5rem;overflow:hidden}.torrent-card-progress-bar{background:linear-gradient(90deg,#3b82f6,#22c55e);border-radius:3px;height:100%;transition:width .3s}.torrent-card.ready{border-color:#22c55e}.torrent-card.ready:before{opacity:1;background:#22c55e}.details-overlay{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:100;background:#000000e6;justify-content:center;align-items:center;animation:.2s ease-out fadeIn;display:flex;position:fixed;inset:0}.details-modal{text-align:center;background:linear-gradient(#1e293b,#0f172a);border:1px solid #334155;border-radius:24px;width:90%;max-width:700px;padding:3rem}.details-title{margin-bottom:1rem;font-size:2.5rem;font-weight:700;line-height:1.2}.details-progress-container{margin:2rem 0}.details-progress-bar{background:#334155;border-radius:6px;height:12px;overflow:hidden}.details-progress-fill{background:linear-gradient(90deg,#3b82f6,#22c55e);border-radius:6px;height:100%;transition:width .3s}.details-status{margin-top:.75rem;font-size:1.25rem}.details-status.ready{color:#22c55e}.details-status.loading{color:#fbbf24}.details-buttons{flex-direction:column;gap:1rem;margin-top:2.5rem;display:flex}.details-btn-watch{color:#fff;cursor:pointer;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:16px;padding:1.25rem 2rem;font-size:1.5rem;font-weight:700;transition:all .2s}.details-btn-watch:focus{transform:scale(1.05);box-shadow:0 0 0 4px #22c55e99,0 8px 30px #22c55e4d}.details-btn-delete{color:#ef4444;cursor:pointer;background:0 0;border:2px solid #ef4444;border-radius:12px;padding:.75rem 1.5rem;font-size:1rem;transition:all .2s}.details-btn-delete:focus{color:#fff;background:#ef4444;box-shadow:0 0 0 4px #ef444480}.details-back{color:#64748b;margin-top:2rem;font-size:.875rem}@media(max-width:640px){.netflix-grid{grid-template-columns:1fr;gap:1rem;padding:.75rem}.torrent-card{aspect-ratio:auto;padding:1rem}.details-modal{border:2px solid #475569;border-radius:24px;max-width:95%;padding:2.5rem}.details-title{margin-bottom:2rem;font-size:2rem}.details-progress-bar{height:20px}.details-btn-watch{width:100%;margin-bottom:1rem;padding:1.5rem 3rem;font-size:1.75rem}.details-btn-delete{width:100%;padding:1.25rem;font-size:1.25rem}.details-back{opacity:.8;margin-top:2rem;font-size:1.25rem}}.animate-fade-in{animation:.2s ease-out fadeIn}@keyframes fadeIn{0%{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}.header-btn:focus{color:#fff;transform:scale(1.2)}.settings-panel{max-width:500px;margin:0 auto 2rem}@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-gradient-position{syntax:"*";inherits:false}@property --tw-gradient-from{syntax:"<color>";inherits:false;initial-value:#0000}@property --tw-gradient-via{syntax:"<color>";inherits:false;initial-value:#0000}@property --tw-gradient-to{syntax:"<color>";inherits:false;initial-value:#0000}@property --tw-gradient-stops{syntax:"*";inherits:false}@property --tw-gradient-via-stops{syntax:"*";inherits:false}@property --tw-gradient-from-position{syntax:"<length-percentage>";inherits:false;initial-value:0%}@property --tw-gradient-via-position{syntax:"<length-percentage>";inherits:false;initial-value:50%}@property --tw-gradient-to-position{syntax:"<length-percentage>";inherits:false;initial-value:100%}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-tracking{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}@property --tw-backdrop-blur{syntax:"*";inherits:false}@property --tw-backdrop-brightness{syntax:"*";inherits:false}@property --tw-backdrop-contrast{syntax:"*";inherits:false}@property --tw-backdrop-grayscale{syntax:"*";inherits:false}@property --tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --tw-backdrop-invert{syntax:"*";inherits:false}@property --tw-backdrop-opacity{syntax:"*";inherits:false}@property --tw-backdrop-saturate{syntax:"*";inherits:false}@property --tw-backdrop-sepia{syntax:"*";inherits:false}@property --tw-duration{syntax:"*";inherits:false}@property --tw-scale-x{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-y{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-z{syntax:"*";inherits:false;initial-value:1}@keyframes pulse{50%{opacity:.5}}
\n```\n\n### client/android/app/src/main/assets/public/assets/index-DCNFAFrt.js\n\n```js\n(function(){const v=document.createElement("link").relList;if(v&&v.supports&&v.supports("modulepreload"))return;for(const U of document.querySelectorAll('link[rel="modulepreload"]'))r(U);new MutationObserver(U=>{for(const M of U)if(M.type==="childList")for(const B of M.addedNodes)B.tagName==="LINK"&&B.rel==="modulepreload"&&r(B)}).observe(document,{childList:!0,subtree:!0});function O(U){const M={};return U.integrity&&(M.integrity=U.integrity),U.referrerPolicy&&(M.referrerPolicy=U.referrerPolicy),U.crossOrigin==="use-credentials"?M.credentials="include":U.crossOrigin==="anonymous"?M.credentials="omit":M.credentials="same-origin",M}function r(U){if(U.ep)return;U.ep=!0;const M=O(U);fetch(U.href,M)}})();var Ef={exports:{}},qu={};var _d;function iy(){if(_d)return qu;_d=1;var b=Symbol.for("react.transitional.element"),v=Symbol.for("react.fragment");function O(r,U,M){var B=null;if(M!==void 0&&(B=""+M),U.key!==void 0&&(B=""+U.key),"key"in U){M={};for(var C in U)C!=="key"&&(M[C]=U[C])}else M=U;return U=M.ref,{$$typeof:b,type:r,key:B,ref:U!==void 0?U:null,props:M}}return qu.Fragment=v,qu.jsx=O,qu.jsxs=O,qu}var Od;function cy(){return Od||(Od=1,Ef.exports=iy()),Ef.exports}var x=cy(),zf={exports:{}},$={};var Md;function fy(){if(Md)return $;Md=1;var b=Symbol.for("react.transitional.element"),v=Symbol.for("react.portal"),O=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),U=Symbol.for("react.profiler"),M=Symbol.for("react.consumer"),B=Symbol.for("react.context"),C=Symbol.for("react.forward_ref"),j=Symbol.for("react.suspense"),g=Symbol.for("react.memo"),w=Symbol.for("react.lazy"),R=Symbol.for("react.activity"),Z=Symbol.iterator;function Tl(s){return s===null||typeof s!="object"?null:(s=Z&&s[Z]||s["@@iterator"],typeof s=="function"?s:null)}var vl={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},fl=Object.assign,pl={};function P(s,E,N){this.props=s,this.context=E,this.refs=pl,this.updater=N||vl}P.prototype.isReactComponent={},P.prototype.setState=function(s,E){if(typeof s!="object"&&typeof s!="function"&&s!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,s,E,"setState")},P.prototype.forceUpdate=function(s){this.updater.enqueueForceUpdate(this,s,"forceUpdate")};function Ml(){}Ml.prototype=P.prototype;function Al(s,E,N){this.props=s,this.context=E,this.refs=pl,this.updater=N||vl}var jl=Al.prototype=new Ml;jl.constructor=Al,fl(jl,P.prototype),jl.isPureReactComponent=!0;var ut=Array.isArray;function Vl(){}var G={H:null,A:null,T:null,S:null},el=Object.prototype.hasOwnProperty;function ql(s,E,N){var H=N.ref;return{$$typeof:b,type:s,key:E,ref:H!==void 0?H:null,props:N}}function tt(s,E){return ql(s.type,E,s.props)}function Ul(s){return typeof s=="object"&&s!==null&&s.$$typeof===b}function zl(s){var E={"=":"=0",":":"=2"};return"$"+s.replace(/[=:]/g,function(N){return E[N]})}var mt=/\/+/g;function Yl(s,E){return typeof s=="object"&&s!==null&&s.key!=null?zl(""+s.key):E.toString(36)}function Kl(s){switch(s.status){case"fulfilled":return s.value;case"rejected":throw s.reason;default:switch(typeof s.status=="string"?s.then(Vl,Vl):(s.status="pending",s.then(function(E){s.status==="pending"&&(s.status="fulfilled",s.value=E)},function(E){s.status==="pending"&&(s.status="rejected",s.reason=E)})),s.status){case"fulfilled":return s.value;case"rejected":throw s.reason}}throw s}function p(s,E,N,H,L){var J=typeof s;(J==="undefined"||J==="boolean")&&(s=null);var I=!1;if(s===null)I=!0;else switch(J){case"bigint":case"string":case"number":I=!0;break;case"object":switch(s.$$typeof){case b:case v:I=!0;break;case w:return I=s._init,p(I(s._payload),E,N,H,L)}}if(I)return L=L(s),I=H===""?"."+Yl(s,0):H,ut(L)?(N="",I!=null&&(N=I.replace(mt,"$&/")+"/"),p(L,E,N,"",function(Rt){return Rt})):L!=null&&(Ul(L)&&(L=tt(L,N+(L.key==null||s&&s.key===L.key?"":(""+L.key).replace(mt,"$&/")+"/")+I)),E.push(L)),1;I=0;var kl=H===""?".":H+":";if(ut(s))for(var Dl=0;Dl<s.length;Dl++)H=s[Dl],J=kl+Yl(H,Dl),I+=p(H,E,N,J,L);else if(Dl=Tl(s),typeof Dl=="function")for(s=Dl.call(s),Dl=0;!(H=s.next()).done;)H=H.value,J=kl+Yl(H,Dl++),I+=p(H,E,N,J,L);else if(J==="object"){if(typeof s.then=="function")return p(Kl(s),E,N,H,L);throw E=String(s),Error("Objects are not valid as a React child (found: "+(E==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":E)+"). If you meant to render a collection of children, use an array instead.")}return I}function D(s,E,N){if(s==null)return s;var H=[],L=0;return p(s,H,"","",function(J){return E.call(N,J,L++)}),H}function X(s){if(s._status===-1){var E=s._result;E=E(),E.then(function(N){(s._status===0||s._status===-1)&&(s._status=1,s._result=N)},function(N){(s._status===0||s._status===-1)&&(s._status=2,s._result=N)}),s._status===-1&&(s._status=0,s._result=E)}if(s._status===1)return s._result.default;throw s._result}var il=typeof reportError=="function"?reportError:function(s){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var E=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof s=="object"&&s!==null&&typeof s.message=="string"?String(s.message):String(s),error:s});if(!window.dispatchEvent(E))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",s);return}console.error(s)},K={map:D,forEach:function(s,E,N){D(s,function(){E.apply(this,arguments)},N)},count:function(s){var E=0;return D(s,function(){E++}),E},toArray:function(s){return D(s,function(E){return E})||[]},only:function(s){if(!Ul(s))throw Error("React.Children.only expected to receive a single React element child.");return s}};return $.Activity=R,$.Children=K,$.Component=P,$.Fragment=O,$.Profiler=U,$.PureComponent=Al,$.StrictMode=r,$.Suspense=j,$.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=G,$.__COMPILER_RUNTIME={__proto__:null,c:function(s){return G.H.useMemoCache(s)}},$.cache=function(s){return function(){return s.apply(null,arguments)}},$.cacheSignal=function(){return null},$.cloneElement=function(s,E,N){if(s==null)throw Error("The argument must be a React element, but you passed "+s+".");var H=fl({},s.props),L=s.key;if(E!=null)for(J in E.key!==void 0&&(L=""+E.key),E)!el.call(E,J)||J==="key"||J==="__self"||J==="__source"||J==="ref"&&E.ref===void 0||(H[J]=E[J]);var J=arguments.length-2;if(J===1)H.children=N;else if(1<J){for(var I=Array(J),kl=0;kl<J;kl++)I[kl]=arguments[kl+2];H.children=I}return ql(s.type,L,H)},$.createContext=function(s){return s={$$typeof:B,_currentValue:s,_currentValue2:s,_threadCount:0,Provider:null,Consumer:null},s.Provider=s,s.Consumer={$$typeof:M,_context:s},s},$.createElement=function(s,E,N){var H,L={},J=null;if(E!=null)for(H in E.key!==void 0&&(J=""+E.key),E)el.call(E,H)&&H!=="key"&&H!=="__self"&&H!=="__source"&&(L[H]=E[H]);var I=arguments.length-2;if(I===1)L.children=N;else if(1<I){for(var kl=Array(I),Dl=0;Dl<I;Dl++)kl[Dl]=arguments[Dl+2];L.children=kl}if(s&&s.defaultProps)for(H in I=s.defaultProps,I)L[H]===void 0&&(L[H]=I[H]);return ql(s,J,L)},$.createRef=function(){return{current:null}},$.forwardRef=function(s){return{$$typeof:C,render:s}},$.isValidElement=Ul,$.lazy=function(s){return{$$typeof:w,_payload:{_status:-1,_result:s},_init:X}},$.memo=function(s,E){return{$$typeof:g,type:s,compare:E===void 0?null:E}},$.startTransition=function(s){var E=G.T,N={};G.T=N;try{var H=s(),L=G.S;L!==null&&L(N,H),typeof H=="object"&&H!==null&&typeof H.then=="function"&&H.then(Vl,il)}catch(J){il(J)}finally{E!==null&&N.types!==null&&(E.types=N.types),G.T=E}},$.unstable_useCacheRefresh=function(){return G.H.useCacheRefresh()},$.use=function(s){return G.H.use(s)},$.useActionState=function(s,E,N){return G.H.useActionState(s,E,N)},$.useCallback=function(s,E){return G.H.useCallback(s,E)},$.useContext=function(s){return G.H.useContext(s)},$.useDebugValue=function(){},$.useDeferredValue=function(s,E){return G.H.useDeferredValue(s,E)},$.useEffect=function(s,E){return G.H.useEffect(s,E)},$.useEffectEvent=function(s){return G.H.useEffectEvent(s)},$.useId=function(){return G.H.useId()},$.useImperativeHandle=function(s,E,N){return G.H.useImperativeHandle(s,E,N)},$.useInsertionEffect=function(s,E){return G.H.useInsertionEffect(s,E)},$.useLayoutEffect=function(s,E){return G.H.useLayoutEffect(s,E)},$.useMemo=function(s,E){return G.H.useMemo(s,E)},$.useOptimistic=function(s,E){return G.H.useOptimistic(s,E)},$.useReducer=function(s,E,N){return G.H.useReducer(s,E,N)},$.useRef=function(s){return G.H.useRef(s)},$.useState=function(s){return G.H.useState(s)},$.useSyncExternalStore=function(s,E,N){return G.H.useSyncExternalStore(s,E,N)},$.useTransition=function(){return G.H.useTransition()},$.version="19.2.0",$}var Ud;function Mf(){return Ud||(Ud=1,zf.exports=fy()),zf.exports}var yl=Mf(),Tf={exports:{}},Yu={},Af={exports:{}},xf={};var Nd;function sy(){return Nd||(Nd=1,(function(b){function v(p,D){var X=p.length;p.push(D);l:for(;0<X;){var il=X-1>>>1,K=p[il];if(0<U(K,D))p[il]=D,p[X]=K,X=il;else break l}}function O(p){return p.length===0?null:p[0]}function r(p){if(p.length===0)return null;var D=p[0],X=p.pop();if(X!==D){p[0]=X;l:for(var il=0,K=p.length,s=K>>>1;il<s;){var E=2*(il+1)-1,N=p[E],H=E+1,L=p[H];if(0>U(N,X))H<K&&0>U(L,N)?(p[il]=L,p[H]=X,il=H):(p[il]=N,p[E]=X,il=E);else if(H<K&&0>U(L,X))p[il]=L,p[H]=X,il=H;else break l}}return D}function U(p,D){var X=p.sortIndex-D.sortIndex;return X!==0?X:p.id-D.id}if(b.unstable_now=void 0,typeof performance=="object"&&typeof performance.now=="function"){var M=performance;b.unstable_now=function(){return M.now()}}else{var B=Date,C=B.now();b.unstable_now=function(){return B.now()-C}}var j=[],g=[],w=1,R=null,Z=3,Tl=!1,vl=!1,fl=!1,pl=!1,P=typeof setTimeout=="function"?setTimeout:null,Ml=typeof clearTimeout=="function"?clearTimeout:null,Al=typeof setImmediate<"u"?setImmediate:null;function jl(p){for(var D=O(g);D!==null;){if(D.callback===null)r(g);else if(D.startTime<=p)r(g),D.sortIndex=D.expirationTime,v(j,D);else break;D=O(g)}}function ut(p){if(fl=!1,jl(p),!vl)if(O(j)!==null)vl=!0,Vl||(Vl=!0,zl());else{var D=O(g);D!==null&&Kl(ut,D.startTime-p)}}var Vl=!1,G=-1,el=5,ql=-1;function tt(){return pl?!0:!(b.unstable_now()-ql<el)}function Ul(){if(pl=!1,Vl){var p=b.unstable_now();ql=p;var D=!0;try{l:{vl=!1,fl&&(fl=!1,Ml(G),G=-1),Tl=!0;var X=Z;try{t:{for(jl(p),R=O(j);R!==null&&!(R.expirationTime>p&&tt());){var il=R.callback;if(typeof il=="function"){R.callback=null,Z=R.priorityLevel;var K=il(R.expirationTime<=p);if(p=b.unstable_now(),typeof K=="function"){R.callback=K,jl(p),D=!0;break t}R===O(j)&&r(j),jl(p)}else r(j);R=O(j)}if(R!==null)D=!0;else{var s=O(g);s!==null&&Kl(ut,s.startTime-p),D=!1}}break l}finally{R=null,Z=X,Tl=!1}D=void 0}}finally{D?zl():Vl=!1}}}var zl;if(typeof Al=="function")zl=function(){Al(Ul)};else if(typeof MessageChannel<"u"){var mt=new MessageChannel,Yl=mt.port2;mt.port1.onmessage=Ul,zl=function(){Yl.postMessage(null)}}else zl=function(){P(Ul,0)};function Kl(p,D){G=P(function(){p(b.unstable_now())},D)}b.unstable_IdlePriority=5,b.unstable_ImmediatePriority=1,b.unstable_LowPriority=4,b.unstable_NormalPriority=3,b.unstable_Profiling=null,b.unstable_UserBlockingPriority=2,b.unstable_cancelCallback=function(p){p.callback=null},b.unstable_forceFrameRate=function(p){0>p||125<p?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):el=0<p?Math.floor(1e3/p):5},b.unstable_getCurrentPriorityLevel=function(){return Z},b.unstable_next=function(p){switch(Z){case 1:case 2:case 3:var D=3;break;default:D=Z}var X=Z;Z=D;try{return p()}finally{Z=X}},b.unstable_requestPaint=function(){pl=!0},b.unstable_runWithPriority=function(p,D){switch(p){case 1:case 2:case 3:case 4:case 5:break;default:p=3}var X=Z;Z=p;try{return D()}finally{Z=X}},b.unstable_scheduleCallback=function(p,D,X){var il=b.unstable_now();switch(typeof X=="object"&&X!==null?(X=X.delay,X=typeof X=="number"&&0<X?il+X:il):X=il,p){case 1:var K=-1;break;case 2:K=250;break;case 5:K=1073741823;break;case 4:K=1e4;break;default:K=5e3}return K=X+K,p={id:w++,callback:D,priorityLevel:p,startTime:X,expirationTime:K,sortIndex:-1},X>il?(p.sortIndex=X,v(g,p),O(j)===null&&p===O(g)&&(fl?(Ml(G),G=-1):fl=!0,Kl(ut,X-il))):(p.sortIndex=K,v(j,p),vl||Tl||(vl=!0,Vl||(Vl=!0,zl()))),p},b.unstable_shouldYield=tt,b.unstable_wrapCallback=function(p){var D=Z;return function(){var X=Z;Z=D;try{return p.apply(this,arguments)}finally{Z=X}}}})(xf)),xf}var Dd;function oy(){return Dd||(Dd=1,Af.exports=sy()),Af.exports}var _f={exports:{}},et={};var jd;function ry(){if(jd)return et;jd=1;var b=Mf();function v(j){var g="https://react.dev/errors/"+j;if(1<arguments.length){g+="?args[]="+encodeURIComponent(arguments[1]);for(var w=2;w<arguments.length;w++)g+="&args[]="+encodeURIComponent(arguments[w])}return"Minified React error #"+j+"; visit "+g+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function O(){}var r={d:{f:O,r:function(){throw Error(v(522))},D:O,C:O,L:O,m:O,X:O,S:O,M:O},p:0,findDOMNode:null},U=Symbol.for("react.portal");function M(j,g,w){var R=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:U,key:R==null?null:""+R,children:j,containerInfo:g,implementation:w}}var B=b.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function C(j,g){if(j==="font")return"";if(typeof g=="string")return g==="use-credentials"?g:""}return et.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=r,et.createPortal=function(j,g){var w=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!g||g.nodeType!==1&&g.nodeType!==9&&g.nodeType!==11)throw Error(v(299));return M(j,g,null,w)},et.flushSync=function(j){var g=B.T,w=r.p;try{if(B.T=null,r.p=2,j)return j()}finally{B.T=g,r.p=w,r.d.f()}},et.preconnect=function(j,g){typeof j=="string"&&(g?(g=g.crossOrigin,g=typeof g=="string"?g==="use-credentials"?g:"":void 0):g=null,r.d.C(j,g))},et.prefetchDNS=function(j){typeof j=="string"&&r.d.D(j)},et.preinit=function(j,g){if(typeof j=="string"&&g&&typeof g.as=="string"){var w=g.as,R=C(w,g.crossOrigin),Z=typeof g.integrity=="string"?g.integrity:void 0,Tl=typeof g.fetchPriority=="string"?g.fetchPriority:void 0;w==="style"?r.d.S(j,typeof g.precedence=="string"?g.precedence:void 0,{crossOrigin:R,integrity:Z,fetchPriority:Tl}):w==="script"&&r.d.X(j,{crossOrigin:R,integrity:Z,fetchPriority:Tl,nonce:typeof g.nonce=="string"?g.nonce:void 0})}},et.preinitModule=function(j,g){if(typeof j=="string")if(typeof g=="object"&&g!==null){if(g.as==null||g.as==="script"){var w=C(g.as,g.crossOrigin);r.d.M(j,{crossOrigin:w,integrity:typeof g.integrity=="string"?g.integrity:void 0,nonce:typeof g.nonce=="string"?g.nonce:void 0})}}else g==null&&r.d.M(j)},et.preload=function(j,g){if(typeof j=="string"&&typeof g=="object"&&g!==null&&typeof g.as=="string"){var w=g.as,R=C(w,g.crossOrigin);r.d.L(j,w,{crossOrigin:R,integrity:typeof g.integrity=="string"?g.integrity:void 0,nonce:typeof g.nonce=="string"?g.nonce:void 0,type:typeof g.type=="string"?g.type:void 0,fetchPriority:typeof g.fetchPriority=="string"?g.fetchPriority:void 0,referrerPolicy:typeof g.referrerPolicy=="string"?g.referrerPolicy:void 0,imageSrcSet:typeof g.imageSrcSet=="string"?g.imageSrcSet:void 0,imageSizes:typeof g.imageSizes=="string"?g.imageSizes:void 0,media:typeof g.media=="string"?g.media:void 0})}},et.preloadModule=function(j,g){if(typeof j=="string")if(g){var w=C(g.as,g.crossOrigin);r.d.m(j,{as:typeof g.as=="string"&&g.as!=="script"?g.as:void 0,crossOrigin:w,integrity:typeof g.integrity=="string"?g.integrity:void 0})}else r.d.m(j)},et.requestFormReset=function(j){r.d.r(j)},et.unstable_batchedUpdates=function(j,g){return j(g)},et.useFormState=function(j,g,w){return B.H.useFormState(j,g,w)},et.useFormStatus=function(){return B.H.useHostTransitionStatus()},et.version="19.2.0",et}var Cd;function dy(){if(Cd)return _f.exports;Cd=1;function b(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(b)}catch(v){console.error(v)}}return b(),_f.exports=ry(),_f.exports}var Hd;function my(){if(Hd)return Yu;Hd=1;var b=oy(),v=Mf(),O=dy();function r(l){var t="https://react.dev/errors/"+l;if(1<arguments.length){t+="?args[]="+encodeURIComponent(arguments[1]);for(var e=2;e<arguments.length;e++)t+="&args[]="+encodeURIComponent(arguments[e])}return"Minified React error #"+l+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function U(l){return!(!l||l.nodeType!==1&&l.nodeType!==9&&l.nodeType!==11)}function M(l){var t=l,e=l;if(l.alternate)for(;t.return;)t=t.return;else{l=t;do t=l,(t.flags&4098)!==0&&(e=t.return),l=t.return;while(l)}return t.tag===3?e:null}function B(l){if(l.tag===13){var t=l.memoizedState;if(t===null&&(l=l.alternate,l!==null&&(t=l.memoizedState)),t!==null)return t.dehydrated}return null}function C(l){if(l.tag===31){var t=l.memoizedState;if(t===null&&(l=l.alternate,l!==null&&(t=l.memoizedState)),t!==null)return t.dehydrated}return null}function j(l){if(M(l)!==l)throw Error(r(188))}function g(l){var t=l.alternate;if(!t){if(t=M(l),t===null)throw Error(r(188));return t!==l?null:l}for(var e=l,a=t;;){var u=e.return;if(u===null)break;var n=u.alternate;if(n===null){if(a=u.return,a!==null){e=a;continue}break}if(u.child===n.child){for(n=u.child;n;){if(n===e)return j(u),l;if(n===a)return j(u),t;n=n.sibling}throw Error(r(188))}if(e.return!==a.return)e=u,a=n;else{for(var i=!1,c=u.child;c;){if(c===e){i=!0,e=u,a=n;break}if(c===a){i=!0,a=u,e=n;break}c=c.sibling}if(!i){for(c=n.child;c;){if(c===e){i=!0,e=n,a=u;break}if(c===a){i=!0,a=n,e=u;break}c=c.sibling}if(!i)throw Error(r(189))}}if(e.alternate!==a)throw Error(r(190))}if(e.tag!==3)throw Error(r(188));return e.stateNode.current===e?l:t}function w(l){var t=l.tag;if(t===5||t===26||t===27||t===6)return l;for(l=l.child;l!==null;){if(t=w(l),t!==null)return t;l=l.sibling}return null}var R=Object.assign,Z=Symbol.for("react.element"),Tl=Symbol.for("react.transitional.element"),vl=Symbol.for("react.portal"),fl=Symbol.for("react.fragment"),pl=Symbol.for("react.strict_mode"),P=Symbol.for("react.profiler"),Ml=Symbol.for("react.consumer"),Al=Symbol.for("react.context"),jl=Symbol.for("react.forward_ref"),ut=Symbol.for("react.suspense"),Vl=Symbol.for("react.suspense_list"),G=Symbol.for("react.memo"),el=Symbol.for("react.lazy"),ql=Symbol.for("react.activity"),tt=Symbol.for("react.memo_cache_sentinel"),Ul=Symbol.iterator;function zl(l){return l===null||typeof l!="object"?null:(l=Ul&&l[Ul]||l["@@iterator"],typeof l=="function"?l:null)}var mt=Symbol.for("react.client.reference");function Yl(l){if(l==null)return null;if(typeof l=="function")return l.$$typeof===mt?null:l.displayName||l.name||null;if(typeof l=="string")return l;switch(l){case fl:return"Fragment";case P:return"Profiler";case pl:return"StrictMode";case ut:return"Suspense";case Vl:return"SuspenseList";case ql:return"Activity"}if(typeof l=="object")switch(l.$$typeof){case vl:return"Portal";case Al:return l.displayName||"Context";case Ml:return(l._context.displayName||"Context")+".Consumer";case jl:var t=l.render;return l=l.displayName,l||(l=t.displayName||t.name||"",l=l!==""?"ForwardRef("+l+")":"ForwardRef"),l;case G:return t=l.displayName||null,t!==null?t:Yl(l.type)||"Memo";case el:t=l._payload,l=l._init;try{return Yl(l(t))}catch{}}return null}var Kl=Array.isArray,p=v.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,D=O.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,X={pending:!1,data:null,method:null,action:null},il=[],K=-1;function s(l){return{current:l}}function E(l){0>K||(l.current=il[K],il[K]=null,K--)}function N(l,t){K++,il[K]=l.current,l.current=t}var H=s(null),L=s(null),J=s(null),I=s(null);function kl(l,t){switch(N(J,t),N(L,l),N(H,null),t.nodeType){case 9:case 11:l=(l=t.documentElement)&&(l=l.namespaceURI)?kr(l):0;break;default:if(l=t.tagName,t=t.namespaceURI)t=kr(t),l=Wr(t,l);else switch(l){case"svg":l=1;break;case"math":l=2;break;default:l=0}}E(H),N(H,l)}function Dl(){E(H),E(L),E(J)}function Rt(l){l.memoizedState!==null&&N(I,l);var t=H.current,e=Wr(t,l.type);t!==e&&(N(L,l),N(H,e))}function At(l){L.current===l&&(E(H),E(L)),I.current===l&&(E(I),Cu._currentValue=X)}var se,Xu;function Gt(l){if(se===void 0)try{throw Error()}catch(e){var t=e.stack.trim().match(/\n( *(at )?)/);se=t&&t[1]||"",Xu=-1<e.stack.indexOf(`
    at`)?" (<anonymous>)":-1<e.stack.indexOf("@")?"@unknown:0:0":""}return`
`+se+l+Xu}var Ga=!1;function La(l,t){if(!l||Ga)return"";Ga=!0;var e=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var a={DetermineComponentFrameRoot:function(){try{if(t){var _=function(){throw Error()};if(Object.defineProperty(_.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(_,[])}catch(S){var h=S}Reflect.construct(l,[],_)}else{try{_.call()}catch(S){h=S}l.call(_.prototype)}}else{try{throw Error()}catch(S){h=S}(_=l())&&typeof _.catch=="function"&&_.catch(function(){})}}catch(S){if(S&&h&&typeof S.stack=="string")return[S.stack,h.stack]}return[null,null]}};a.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var u=Object.getOwnPropertyDescriptor(a.DetermineComponentFrameRoot,"name");u&&u.configurable&&Object.defineProperty(a.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var n=a.DetermineComponentFrameRoot(),i=n[0],c=n[1];if(i&&c){var f=i.split(`
`),y=c.split(`
`);for(u=a=0;a<f.length&&!f[a].includes("DetermineComponentFrameRoot");)a++;for(;u<y.length&&!y[u].includes("DetermineComponentFrameRoot");)u++;if(a===f.length||u===y.length)for(a=f.length-1,u=y.length-1;1<=a&&0<=u&&f[a]!==y[u];)u--;for(;1<=a&&0<=u;a--,u--)if(f[a]!==y[u]){if(a!==1||u!==1)do if(a--,u--,0>u||f[a]!==y[u]){var T=`
`+f[a].replace(" at new "," at ");return l.displayName&&T.includes("<anonymous>")&&(T=T.replace("<anonymous>",l.displayName)),T}while(1<=a&&0<=u);break}}}finally{Ga=!1,Error.prepareStackTrace=e}return(e=l?l.displayName||l.name:"")?Gt(e):""}function Qa(l,t){switch(l.tag){case 26:case 27:case 5:return Gt(l.type);case 16:return Gt("Lazy");case 13:return l.child!==t&&t!==null?Gt("Suspense Fallback"):Gt("Suspense");case 19:return Gt("SuspenseList");case 0:case 15:return La(l.type,!1);case 11:return La(l.type.render,!1);case 1:return La(l.type,!0);case 31:return Gt("Activity");default:return""}}function Ie(l){try{var t="",e=null;do t+=Qa(l,e),e=l,l=l.return;while(l);return t}catch(a){return`
Error generating stack: `+a.message+`
`+a.stack}}var Xa=Object.prototype.hasOwnProperty,Za=b.unstable_scheduleCallback,z=b.unstable_cancelCallback,k=b.unstable_shouldYield,hl=b.unstable_requestPaint,al=b.unstable_now,nt=b.unstable_getCurrentPriorityLevel,wl=b.unstable_ImmediatePriority,yt=b.unstable_UserBlockingPriority,xl=b.unstable_NormalPriority,Va=b.unstable_LowPriority,Zu=b.unstable_IdlePriority,Xd=b.log,Zd=b.unstable_setDisableYieldValue,Ka=null,vt=null;function oe(l){if(typeof Xd=="function"&&Zd(l),vt&&typeof vt.setStrictMode=="function")try{vt.setStrictMode(Ka,l)}catch{}}var ht=Math.clz32?Math.clz32:wd,Vd=Math.log,Kd=Math.LN2;function wd(l){return l>>>=0,l===0?32:31-(Vd(l)/Kd|0)|0}var Vu=256,Ku=262144,wu=4194304;function Re(l){var t=l&42;if(t!==0)return t;switch(l&-l){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:return l&261888;case 262144:case 524288:case 1048576:case 2097152:return l&3932160;case 4194304:case 8388608:case 16777216:case 33554432:return l&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return l}}function Ju(l,t,e){var a=l.pendingLanes;if(a===0)return 0;var u=0,n=l.suspendedLanes,i=l.pingedLanes;l=l.warmLanes;var c=a&134217727;return c!==0?(a=c&~n,a!==0?u=Re(a):(i&=c,i!==0?u=Re(i):e||(e=c&~l,e!==0&&(u=Re(e))))):(c=a&~n,c!==0?u=Re(c):i!==0?u=Re(i):e||(e=a&~l,e!==0&&(u=Re(e)))),u===0?0:t!==0&&t!==u&&(t&n)===0&&(n=u&-u,e=t&-t,n>=e||n===32&&(e&4194048)!==0)?t:u}function wa(l,t){return(l.pendingLanes&~(l.suspendedLanes&~l.pingedLanes)&t)===0}function Jd(l,t){switch(l){case 1:case 2:case 4:case 8:case 64:return t+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Uf(){var l=wu;return wu<<=1,(wu&62914560)===0&&(wu=4194304),l}function fi(l){for(var t=[],e=0;31>e;e++)t.push(l);return t}function Ja(l,t){l.pendingLanes|=t,t!==268435456&&(l.suspendedLanes=0,l.pingedLanes=0,l.warmLanes=0)}function $d(l,t,e,a,u,n){var i=l.pendingLanes;l.pendingLanes=e,l.suspendedLanes=0,l.pingedLanes=0,l.warmLanes=0,l.expiredLanes&=e,l.entangledLanes&=e,l.errorRecoveryDisabledLanes&=e,l.shellSuspendCounter=0;var c=l.entanglements,f=l.expirationTimes,y=l.hiddenUpdates;for(e=i&~e;0<e;){var T=31-ht(e),_=1<<T;c[T]=0,f[T]=-1;var h=y[T];if(h!==null)for(y[T]=null,T=0;T<h.length;T++){var S=h[T];S!==null&&(S.lane&=-536870913)}e&=~_}a!==0&&Nf(l,a,0),n!==0&&u===0&&l.tag!==0&&(l.suspendedLanes|=n&~(i&~t))}function Nf(l,t,e){l.pendingLanes|=t,l.suspendedLanes&=~t;var a=31-ht(t);l.entangledLanes|=t,l.entanglements[a]=l.entanglements[a]|1073741824|e&261930}function Df(l,t){var e=l.entangledLanes|=t;for(l=l.entanglements;e;){var a=31-ht(e),u=1<<a;u&t|l[a]&t&&(l[a]|=t),e&=~u}}function jf(l,t){var e=t&-t;return e=(e&42)!==0?1:si(e),(e&(l.suspendedLanes|t))!==0?0:e}function si(l){switch(l){case 2:l=1;break;case 8:l=4;break;case 32:l=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:l=128;break;case 268435456:l=134217728;break;default:l=0}return l}function oi(l){return l&=-l,2<l?8<l?(l&134217727)!==0?32:268435456:8:2}function Cf(){var l=D.p;return l!==0?l:(l=window.event,l===void 0?32:Sd(l.type))}function Hf(l,t){var e=D.p;try{return D.p=l,t()}finally{D.p=e}}var re=Math.random().toString(36).slice(2),Wl="__reactFiber$"+re,it="__reactProps$"+re,la="__reactContainer$"+re,ri="__reactEvents$"+re,kd="__reactListeners$"+re,Wd="__reactHandles$"+re,Rf="__reactResources$"+re,$a="__reactMarker$"+re;function di(l){delete l[Wl],delete l[it],delete l[ri],delete l[kd],delete l[Wd]}function ta(l){var t=l[Wl];if(t)return t;for(var e=l.parentNode;e;){if(t=e[la]||e[Wl]){if(e=t.alternate,t.child!==null||e!==null&&e.child!==null)for(l=ad(l);l!==null;){if(e=l[Wl])return e;l=ad(l)}return t}l=e,e=l.parentNode}return null}function ea(l){if(l=l[Wl]||l[la]){var t=l.tag;if(t===5||t===6||t===13||t===31||t===26||t===27||t===3)return l}return null}function ka(l){var t=l.tag;if(t===5||t===26||t===27||t===6)return l.stateNode;throw Error(r(33))}function aa(l){var t=l[Rf];return t||(t=l[Rf]={hoistableStyles:new Map,hoistableScripts:new Map}),t}function Jl(l){l[$a]=!0}var Bf=new Set,qf={};function Be(l,t){ua(l,t),ua(l+"Capture",t)}function ua(l,t){for(qf[l]=t,l=0;l<t.length;l++)Bf.add(t[l])}var Fd=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),Yf={},Gf={};function Pd(l){return Xa.call(Gf,l)?!0:Xa.call(Yf,l)?!1:Fd.test(l)?Gf[l]=!0:(Yf[l]=!0,!1)}function $u(l,t,e){if(Pd(t))if(e===null)l.removeAttribute(t);else{switch(typeof e){case"undefined":case"function":case"symbol":l.removeAttribute(t);return;case"boolean":var a=t.toLowerCase().slice(0,5);if(a!=="data-"&&a!=="aria-"){l.removeAttribute(t);return}}l.setAttribute(t,""+e)}}function ku(l,t,e){if(e===null)l.removeAttribute(t);else{switch(typeof e){case"undefined":case"function":case"symbol":case"boolean":l.removeAttribute(t);return}l.setAttribute(t,""+e)}}function Vt(l,t,e,a){if(a===null)l.removeAttribute(e);else{switch(typeof a){case"undefined":case"function":case"symbol":case"boolean":l.removeAttribute(e);return}l.setAttributeNS(t,e,""+a)}}function xt(l){switch(typeof l){case"bigint":case"boolean":case"number":case"string":case"undefined":return l;case"object":return l;default:return""}}function Lf(l){var t=l.type;return(l=l.nodeName)&&l.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function Id(l,t,e){var a=Object.getOwnPropertyDescriptor(l.constructor.prototype,t);if(!l.hasOwnProperty(t)&&typeof a<"u"&&typeof a.get=="function"&&typeof a.set=="function"){var u=a.get,n=a.set;return Object.defineProperty(l,t,{configurable:!0,get:function(){return u.call(this)},set:function(i){e=""+i,n.call(this,i)}}),Object.defineProperty(l,t,{enumerable:a.enumerable}),{getValue:function(){return e},setValue:function(i){e=""+i},stopTracking:function(){l._valueTracker=null,delete l[t]}}}}function mi(l){if(!l._valueTracker){var t=Lf(l)?"checked":"value";l._valueTracker=Id(l,t,""+l[t])}}function Qf(l){if(!l)return!1;var t=l._valueTracker;if(!t)return!0;var e=t.getValue(),a="";return l&&(a=Lf(l)?l.checked?"true":"false":l.value),l=a,l!==e?(t.setValue(l),!0):!1}function Wu(l){if(l=l||(typeof document<"u"?document:void 0),typeof l>"u")return null;try{return l.activeElement||l.body}catch{return l.body}}var l0=/[\n"\\]/g;function _t(l){return l.replace(l0,function(t){return"\\"+t.charCodeAt(0).toString(16)+" "})}function yi(l,t,e,a,u,n,i,c){l.name="",i!=null&&typeof i!="function"&&typeof i!="symbol"&&typeof i!="boolean"?l.type=i:l.removeAttribute("type"),t!=null?i==="number"?(t===0&&l.value===""||l.value!=t)&&(l.value=""+xt(t)):l.value!==""+xt(t)&&(l.value=""+xt(t)):i!=="submit"&&i!=="reset"||l.removeAttribute("value"),t!=null?vi(l,i,xt(t)):e!=null?vi(l,i,xt(e)):a!=null&&l.removeAttribute("value"),u==null&&n!=null&&(l.defaultChecked=!!n),u!=null&&(l.checked=u&&typeof u!="function"&&typeof u!="symbol"),c!=null&&typeof c!="function"&&typeof c!="symbol"&&typeof c!="boolean"?l.name=""+xt(c):l.removeAttribute("name")}function Xf(l,t,e,a,u,n,i,c){if(n!=null&&typeof n!="function"&&typeof n!="symbol"&&typeof n!="boolean"&&(l.type=n),t!=null||e!=null){if(!(n!=="submit"&&n!=="reset"||t!=null)){mi(l);return}e=e!=null?""+xt(e):"",t=t!=null?""+xt(t):e,c||t===l.value||(l.value=t),l.defaultValue=t}a=a??u,a=typeof a!="function"&&typeof a!="symbol"&&!!a,l.checked=c?l.checked:!!a,l.defaultChecked=!!a,i!=null&&typeof i!="function"&&typeof i!="symbol"&&typeof i!="boolean"&&(l.name=i),mi(l)}function vi(l,t,e){t==="number"&&Wu(l.ownerDocument)===l||l.defaultValue===""+e||(l.defaultValue=""+e)}function na(l,t,e,a){if(l=l.options,t){t={};for(var u=0;u<e.length;u++)t["$"+e[u]]=!0;for(e=0;e<l.length;e++)u=t.hasOwnProperty("$"+l[e].value),l[e].selected!==u&&(l[e].selected=u),u&&a&&(l[e].defaultSelected=!0)}else{for(e=""+xt(e),t=null,u=0;u<l.length;u++){if(l[u].value===e){l[u].selected=!0,a&&(l[u].defaultSelected=!0);return}t!==null||l[u].disabled||(t=l[u])}t!==null&&(t.selected=!0)}}function Zf(l,t,e){if(t!=null&&(t=""+xt(t),t!==l.value&&(l.value=t),e==null)){l.defaultValue!==t&&(l.defaultValue=t);return}l.defaultValue=e!=null?""+xt(e):""}function Vf(l,t,e,a){if(t==null){if(a!=null){if(e!=null)throw Error(r(92));if(Kl(a)){if(1<a.length)throw Error(r(93));a=a[0]}e=a}e==null&&(e=""),t=e}e=xt(t),l.defaultValue=e,a=l.textContent,a===e&&a!==""&&a!==null&&(l.value=a),mi(l)}function ia(l,t){if(t){var e=l.firstChild;if(e&&e===l.lastChild&&e.nodeType===3){e.nodeValue=t;return}}l.textContent=t}var t0=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));function Kf(l,t,e){var a=t.indexOf("--")===0;e==null||typeof e=="boolean"||e===""?a?l.setProperty(t,""):t==="float"?l.cssFloat="":l[t]="":a?l.setProperty(t,e):typeof e!="number"||e===0||t0.has(t)?t==="float"?l.cssFloat=e:l[t]=(""+e).trim():l[t]=e+"px"}function wf(l,t,e){if(t!=null&&typeof t!="object")throw Error(r(62));if(l=l.style,e!=null){for(var a in e)!e.hasOwnProperty(a)||t!=null&&t.hasOwnProperty(a)||(a.indexOf("--")===0?l.setProperty(a,""):a==="float"?l.cssFloat="":l[a]="");for(var u in t)a=t[u],t.hasOwnProperty(u)&&e[u]!==a&&Kf(l,u,a)}else for(var n in t)t.hasOwnProperty(n)&&Kf(l,n,t[n])}function hi(l){if(l.indexOf("-")===-1)return!1;switch(l){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var e0=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),a0=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function Fu(l){return a0.test(""+l)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":l}function Kt(){}var gi=null;function bi(l){return l=l.target||l.srcElement||window,l.correspondingUseElement&&(l=l.correspondingUseElement),l.nodeType===3?l.parentNode:l}var ca=null,fa=null;function Jf(l){var t=ea(l);if(t&&(l=t.stateNode)){var e=l[it]||null;l:switch(l=t.stateNode,t.type){case"input":if(yi(l,e.value,e.defaultValue,e.defaultValue,e.checked,e.defaultChecked,e.type,e.name),t=e.name,e.type==="radio"&&t!=null){for(e=l;e.parentNode;)e=e.parentNode;for(e=e.querySelectorAll('input[name="'+_t(""+t)+'"][type="radio"]'),t=0;t<e.length;t++){var a=e[t];if(a!==l&&a.form===l.form){var u=a[it]||null;if(!u)throw Error(r(90));yi(a,u.value,u.defaultValue,u.defaultValue,u.checked,u.defaultChecked,u.type,u.name)}}for(t=0;t<e.length;t++)a=e[t],a.form===l.form&&Qf(a)}break l;case"textarea":Zf(l,e.value,e.defaultValue);break l;case"select":t=e.value,t!=null&&na(l,!!e.multiple,t,!1)}}}var Si=!1;function $f(l,t,e){if(Si)return l(t,e);Si=!0;try{var a=l(t);return a}finally{if(Si=!1,(ca!==null||fa!==null)&&(Gn(),ca&&(t=ca,l=fa,fa=ca=null,Jf(t),l)))for(t=0;t<l.length;t++)Jf(l[t])}}function Wa(l,t){var e=l.stateNode;if(e===null)return null;var a=e[it]||null;if(a===null)return null;e=a[t];l:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(a=!a.disabled)||(l=l.type,a=!(l==="button"||l==="input"||l==="select"||l==="textarea")),l=!a;break l;default:l=!1}if(l)return null;if(e&&typeof e!="function")throw Error(r(231,t,typeof e));return e}var wt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),pi=!1;if(wt)try{var Fa={};Object.defineProperty(Fa,"passive",{get:function(){pi=!0}}),window.addEventListener("test",Fa,Fa),window.removeEventListener("test",Fa,Fa)}catch{pi=!1}var de=null,Ei=null,Pu=null;function kf(){if(Pu)return Pu;var l,t=Ei,e=t.length,a,u="value"in de?de.value:de.textContent,n=u.length;for(l=0;l<e&&t[l]===u[l];l++);var i=e-l;for(a=1;a<=i&&t[e-a]===u[n-a];a++);return Pu=u.slice(l,1<a?1-a:void 0)}function Iu(l){var t=l.keyCode;return"charCode"in l?(l=l.charCode,l===0&&t===13&&(l=13)):l=t,l===10&&(l=13),32<=l||l===13?l:0}function ln(){return!0}function Wf(){return!1}function ct(l){function t(e,a,u,n,i){this._reactName=e,this._targetInst=u,this.type=a,this.nativeEvent=n,this.target=i,this.currentTarget=null;for(var c in l)l.hasOwnProperty(c)&&(e=l[c],this[c]=e?e(n):n[c]);return this.isDefaultPrevented=(n.defaultPrevented!=null?n.defaultPrevented:n.returnValue===!1)?ln:Wf,this.isPropagationStopped=Wf,this}return R(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var e=this.nativeEvent;e&&(e.preventDefault?e.preventDefault():typeof e.returnValue!="unknown"&&(e.returnValue=!1),this.isDefaultPrevented=ln)},stopPropagation:function(){var e=this.nativeEvent;e&&(e.stopPropagation?e.stopPropagation():typeof e.cancelBubble!="unknown"&&(e.cancelBubble=!0),this.isPropagationStopped=ln)},persist:function(){},isPersistent:ln}),t}var qe={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(l){return l.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},tn=ct(qe),Pa=R({},qe,{view:0,detail:0}),u0=ct(Pa),zi,Ti,Ia,en=R({},Pa,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:xi,button:0,buttons:0,relatedTarget:function(l){return l.relatedTarget===void 0?l.fromElement===l.srcElement?l.toElement:l.fromElement:l.relatedTarget},movementX:function(l){return"movementX"in l?l.movementX:(l!==Ia&&(Ia&&l.type==="mousemove"?(zi=l.screenX-Ia.screenX,Ti=l.screenY-Ia.screenY):Ti=zi=0,Ia=l),zi)},movementY:function(l){return"movementY"in l?l.movementY:Ti}}),Ff=ct(en),n0=R({},en,{dataTransfer:0}),i0=ct(n0),c0=R({},Pa,{relatedTarget:0}),Ai=ct(c0),f0=R({},qe,{animationName:0,elapsedTime:0,pseudoElement:0}),s0=ct(f0),o0=R({},qe,{clipboardData:function(l){return"clipboardData"in l?l.clipboardData:window.clipboardData}}),r0=ct(o0),d0=R({},qe,{data:0}),Pf=ct(d0),m0={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},y0={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},v0={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function h0(l){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(l):(l=v0[l])?!!t[l]:!1}function xi(){return h0}var g0=R({},Pa,{key:function(l){if(l.key){var t=m0[l.key]||l.key;if(t!=="Unidentified")return t}return l.type==="keypress"?(l=Iu(l),l===13?"Enter":String.fromCharCode(l)):l.type==="keydown"||l.type==="keyup"?y0[l.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:xi,charCode:function(l){return l.type==="keypress"?Iu(l):0},keyCode:function(l){return l.type==="keydown"||l.type==="keyup"?l.keyCode:0},which:function(l){return l.type==="keypress"?Iu(l):l.type==="keydown"||l.type==="keyup"?l.keyCode:0}}),b0=ct(g0),S0=R({},en,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),If=ct(S0),p0=R({},Pa,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:xi}),E0=ct(p0),z0=R({},qe,{propertyName:0,elapsedTime:0,pseudoElement:0}),T0=ct(z0),A0=R({},en,{deltaX:function(l){return"deltaX"in l?l.deltaX:"wheelDeltaX"in l?-l.wheelDeltaX:0},deltaY:function(l){return"deltaY"in l?l.deltaY:"wheelDeltaY"in l?-l.wheelDeltaY:"wheelDelta"in l?-l.wheelDelta:0},deltaZ:0,deltaMode:0}),x0=ct(A0),_0=R({},qe,{newState:0,oldState:0}),O0=ct(_0),M0=[9,13,27,32],_i=wt&&"CompositionEvent"in window,lu=null;wt&&"documentMode"in document&&(lu=document.documentMode);var U0=wt&&"TextEvent"in window&&!lu,ls=wt&&(!_i||lu&&8<lu&&11>=lu),ts=" ",es=!1;function as(l,t){switch(l){case"keyup":return M0.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function us(l){return l=l.detail,typeof l=="object"&&"data"in l?l.data:null}var sa=!1;function N0(l,t){switch(l){case"compositionend":return us(t);case"keypress":return t.which!==32?null:(es=!0,ts);case"textInput":return l=t.data,l===ts&&es?null:l;default:return null}}function D0(l,t){if(sa)return l==="compositionend"||!_i&&as(l,t)?(l=kf(),Pu=Ei=de=null,sa=!1,l):null;switch(l){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return ls&&t.locale!=="ko"?null:t.data;default:return null}}var j0={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ns(l){var t=l&&l.nodeName&&l.nodeName.toLowerCase();return t==="input"?!!j0[l.type]:t==="textarea"}function is(l,t,e,a){ca?fa?fa.push(a):fa=[a]:ca=a,t=wn(t,"onChange"),0<t.length&&(e=new tn("onChange","change",null,e,a),l.push({event:e,listeners:t}))}var tu=null,eu=null;function C0(l){Zr(l,0)}function an(l){var t=ka(l);if(Qf(t))return l}function cs(l,t){if(l==="change")return t}var fs=!1;if(wt){var Oi;if(wt){var Mi="oninput"in document;if(!Mi){var ss=document.createElement("div");ss.setAttribute("oninput","return;"),Mi=typeof ss.oninput=="function"}Oi=Mi}else Oi=!1;fs=Oi&&(!document.documentMode||9<document.documentMode)}function os(){tu&&(tu.detachEvent("onpropertychange",rs),eu=tu=null)}function rs(l){if(l.propertyName==="value"&&an(eu)){var t=[];is(t,eu,l,bi(l)),$f(C0,t)}}function H0(l,t,e){l==="focusin"?(os(),tu=t,eu=e,tu.attachEvent("onpropertychange",rs)):l==="focusout"&&os()}function R0(l){if(l==="selectionchange"||l==="keyup"||l==="keydown")return an(eu)}function B0(l,t){if(l==="click")return an(t)}function q0(l,t){if(l==="input"||l==="change")return an(t)}function Y0(l,t){return l===t&&(l!==0||1/l===1/t)||l!==l&&t!==t}var gt=typeof Object.is=="function"?Object.is:Y0;function au(l,t){if(gt(l,t))return!0;if(typeof l!="object"||l===null||typeof t!="object"||t===null)return!1;var e=Object.keys(l),a=Object.keys(t);if(e.length!==a.length)return!1;for(a=0;a<e.length;a++){var u=e[a];if(!Xa.call(t,u)||!gt(l[u],t[u]))return!1}return!0}function ds(l){for(;l&&l.firstChild;)l=l.firstChild;return l}function ms(l,t){var e=ds(l);l=0;for(var a;e;){if(e.nodeType===3){if(a=l+e.textContent.length,l<=t&&a>=t)return{node:e,offset:t-l};l=a}l:{for(;e;){if(e.nextSibling){e=e.nextSibling;break l}e=e.parentNode}e=void 0}e=ds(e)}}function ys(l,t){return l&&t?l===t?!0:l&&l.nodeType===3?!1:t&&t.nodeType===3?ys(l,t.parentNode):"contains"in l?l.contains(t):l.compareDocumentPosition?!!(l.compareDocumentPosition(t)&16):!1:!1}function vs(l){l=l!=null&&l.ownerDocument!=null&&l.ownerDocument.defaultView!=null?l.ownerDocument.defaultView:window;for(var t=Wu(l.document);t instanceof l.HTMLIFrameElement;){try{var e=typeof t.contentWindow.location.href=="string"}catch{e=!1}if(e)l=t.contentWindow;else break;t=Wu(l.document)}return t}function Ui(l){var t=l&&l.nodeName&&l.nodeName.toLowerCase();return t&&(t==="input"&&(l.type==="text"||l.type==="search"||l.type==="tel"||l.type==="url"||l.type==="password")||t==="textarea"||l.contentEditable==="true")}var G0=wt&&"documentMode"in document&&11>=document.documentMode,oa=null,Ni=null,uu=null,Di=!1;function hs(l,t,e){var a=e.window===e?e.document:e.nodeType===9?e:e.ownerDocument;Di||oa==null||oa!==Wu(a)||(a=oa,"selectionStart"in a&&Ui(a)?a={start:a.selectionStart,end:a.selectionEnd}:(a=(a.ownerDocument&&a.ownerDocument.defaultView||window).getSelection(),a={anchorNode:a.anchorNode,anchorOffset:a.anchorOffset,focusNode:a.focusNode,focusOffset:a.focusOffset}),uu&&au(uu,a)||(uu=a,a=wn(Ni,"onSelect"),0<a.length&&(t=new tn("onSelect","select",null,t,e),l.push({event:t,listeners:a}),t.target=oa)))}function Ye(l,t){var e={};return e[l.toLowerCase()]=t.toLowerCase(),e["Webkit"+l]="webkit"+t,e["Moz"+l]="moz"+t,e}var ra={animationend:Ye("Animation","AnimationEnd"),animationiteration:Ye("Animation","AnimationIteration"),animationstart:Ye("Animation","AnimationStart"),transitionrun:Ye("Transition","TransitionRun"),transitionstart:Ye("Transition","TransitionStart"),transitioncancel:Ye("Transition","TransitionCancel"),transitionend:Ye("Transition","TransitionEnd")},ji={},gs={};wt&&(gs=document.createElement("div").style,"AnimationEvent"in window||(delete ra.animationend.animation,delete ra.animationiteration.animation,delete ra.animationstart.animation),"TransitionEvent"in window||delete ra.transitionend.transition);function Ge(l){if(ji[l])return ji[l];if(!ra[l])return l;var t=ra[l],e;for(e in t)if(t.hasOwnProperty(e)&&e in gs)return ji[l]=t[e];return l}var bs=Ge("animationend"),Ss=Ge("animationiteration"),ps=Ge("animationstart"),L0=Ge("transitionrun"),Q0=Ge("transitionstart"),X0=Ge("transitioncancel"),Es=Ge("transitionend"),zs=new Map,Ci="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");Ci.push("scrollEnd");function Bt(l,t){zs.set(l,t),Be(t,[l])}var un=typeof reportError=="function"?reportError:function(l){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var t=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof l=="object"&&l!==null&&typeof l.message=="string"?String(l.message):String(l),error:l});if(!window.dispatchEvent(t))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",l);return}console.error(l)},Ot=[],da=0,Hi=0;function nn(){for(var l=da,t=Hi=da=0;t<l;){var e=Ot[t];Ot[t++]=null;var a=Ot[t];Ot[t++]=null;var u=Ot[t];Ot[t++]=null;var n=Ot[t];if(Ot[t++]=null,a!==null&&u!==null){var i=a.pending;i===null?u.next=u:(u.next=i.next,i.next=u),a.pending=u}n!==0&&Ts(e,u,n)}}function cn(l,t,e,a){Ot[da++]=l,Ot[da++]=t,Ot[da++]=e,Ot[da++]=a,Hi|=a,l.lanes|=a,l=l.alternate,l!==null&&(l.lanes|=a)}function Ri(l,t,e,a){return cn(l,t,e,a),fn(l)}function Le(l,t){return cn(l,null,null,t),fn(l)}function Ts(l,t,e){l.lanes|=e;var a=l.alternate;a!==null&&(a.lanes|=e);for(var u=!1,n=l.return;n!==null;)n.childLanes|=e,a=n.alternate,a!==null&&(a.childLanes|=e),n.tag===22&&(l=n.stateNode,l===null||l._visibility&1||(u=!0)),l=n,n=n.return;return l.tag===3?(n=l.stateNode,u&&t!==null&&(u=31-ht(e),l=n.hiddenUpdates,a=l[u],a===null?l[u]=[t]:a.push(t),t.lane=e|536870912),n):null}function fn(l){if(50<_u)throw _u=0,Vc=null,Error(r(185));for(var t=l.return;t!==null;)l=t,t=l.return;return l.tag===3?l.stateNode:null}var ma={};function Z0(l,t,e,a){this.tag=l,this.key=e,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=a,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function bt(l,t,e,a){return new Z0(l,t,e,a)}function Bi(l){return l=l.prototype,!(!l||!l.isReactComponent)}function Jt(l,t){var e=l.alternate;return e===null?(e=bt(l.tag,t,l.key,l.mode),e.elementType=l.elementType,e.type=l.type,e.stateNode=l.stateNode,e.alternate=l,l.alternate=e):(e.pendingProps=t,e.type=l.type,e.flags=0,e.subtreeFlags=0,e.deletions=null),e.flags=l.flags&65011712,e.childLanes=l.childLanes,e.lanes=l.lanes,e.child=l.child,e.memoizedProps=l.memoizedProps,e.memoizedState=l.memoizedState,e.updateQueue=l.updateQueue,t=l.dependencies,e.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},e.sibling=l.sibling,e.index=l.index,e.ref=l.ref,e.refCleanup=l.refCleanup,e}function As(l,t){l.flags&=65011714;var e=l.alternate;return e===null?(l.childLanes=0,l.lanes=t,l.child=null,l.subtreeFlags=0,l.memoizedProps=null,l.memoizedState=null,l.updateQueue=null,l.dependencies=null,l.stateNode=null):(l.childLanes=e.childLanes,l.lanes=e.lanes,l.child=e.child,l.subtreeFlags=0,l.deletions=null,l.memoizedProps=e.memoizedProps,l.memoizedState=e.memoizedState,l.updateQueue=e.updateQueue,l.type=e.type,t=e.dependencies,l.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),l}function sn(l,t,e,a,u,n){var i=0;if(a=l,typeof l=="function")Bi(l)&&(i=1);else if(typeof l=="string")i=$m(l,e,H.current)?26:l==="html"||l==="head"||l==="body"?27:5;else l:switch(l){case ql:return l=bt(31,e,t,u),l.elementType=ql,l.lanes=n,l;case fl:return Qe(e.children,u,n,t);case pl:i=8,u|=24;break;case P:return l=bt(12,e,t,u|2),l.elementType=P,l.lanes=n,l;case ut:return l=bt(13,e,t,u),l.elementType=ut,l.lanes=n,l;case Vl:return l=bt(19,e,t,u),l.elementType=Vl,l.lanes=n,l;default:if(typeof l=="object"&&l!==null)switch(l.$$typeof){case Al:i=10;break l;case Ml:i=9;break l;case jl:i=11;break l;case G:i=14;break l;case el:i=16,a=null;break l}i=29,e=Error(r(130,l===null?"null":typeof l,"")),a=null}return t=bt(i,e,t,u),t.elementType=l,t.type=a,t.lanes=n,t}function Qe(l,t,e,a){return l=bt(7,l,a,t),l.lanes=e,l}function qi(l,t,e){return l=bt(6,l,null,t),l.lanes=e,l}function xs(l){var t=bt(18,null,null,0);return t.stateNode=l,t}function Yi(l,t,e){return t=bt(4,l.children!==null?l.children:[],l.key,t),t.lanes=e,t.stateNode={containerInfo:l.containerInfo,pendingChildren:null,implementation:l.implementation},t}var _s=new WeakMap;function Mt(l,t){if(typeof l=="object"&&l!==null){var e=_s.get(l);return e!==void 0?e:(t={value:l,source:t,stack:Ie(t)},_s.set(l,t),t)}return{value:l,source:t,stack:Ie(t)}}var ya=[],va=0,on=null,nu=0,Ut=[],Nt=0,me=null,Lt=1,Qt="";function $t(l,t){ya[va++]=nu,ya[va++]=on,on=l,nu=t}function Os(l,t,e){Ut[Nt++]=Lt,Ut[Nt++]=Qt,Ut[Nt++]=me,me=l;var a=Lt;l=Qt;var u=32-ht(a)-1;a&=~(1<<u),e+=1;var n=32-ht(t)+u;if(30<n){var i=u-u%5;n=(a&(1<<i)-1).toString(32),a>>=i,u-=i,Lt=1<<32-ht(t)+u|e<<u|a,Qt=n+l}else Lt=1<<n|e<<u|a,Qt=l}function Gi(l){l.return!==null&&($t(l,1),Os(l,1,0))}function Li(l){for(;l===on;)on=ya[--va],ya[va]=null,nu=ya[--va],ya[va]=null;for(;l===me;)me=Ut[--Nt],Ut[Nt]=null,Qt=Ut[--Nt],Ut[Nt]=null,Lt=Ut[--Nt],Ut[Nt]=null}function Ms(l,t){Ut[Nt++]=Lt,Ut[Nt++]=Qt,Ut[Nt++]=me,Lt=t.id,Qt=t.overflow,me=l}var Fl=null,_l=null,cl=!1,ye=null,Dt=!1,Qi=Error(r(519));function ve(l){var t=Error(r(418,1<arguments.length&&arguments[1]!==void 0&&arguments[1]?"text":"HTML",""));throw iu(Mt(t,l)),Qi}function Us(l){var t=l.stateNode,e=l.type,a=l.memoizedProps;switch(t[Wl]=l,t[it]=a,e){case"dialog":tl("cancel",t),tl("close",t);break;case"iframe":case"object":case"embed":tl("load",t);break;case"video":case"audio":for(e=0;e<Mu.length;e++)tl(Mu[e],t);break;case"source":tl("error",t);break;case"img":case"image":case"link":tl("error",t),tl("load",t);break;case"details":tl("toggle",t);break;case"input":tl("invalid",t),Xf(t,a.value,a.defaultValue,a.checked,a.defaultChecked,a.type,a.name,!0);break;case"select":tl("invalid",t);break;case"textarea":tl("invalid",t),Vf(t,a.value,a.defaultValue,a.children)}e=a.children,typeof e!="string"&&typeof e!="number"&&typeof e!="bigint"||t.textContent===""+e||a.suppressHydrationWarning===!0||Jr(t.textContent,e)?(a.popover!=null&&(tl("beforetoggle",t),tl("toggle",t)),a.onScroll!=null&&tl("scroll",t),a.onScrollEnd!=null&&tl("scrollend",t),a.onClick!=null&&(t.onclick=Kt),t=!0):t=!1,t||ve(l,!0)}function Ns(l){for(Fl=l.return;Fl;)switch(Fl.tag){case 5:case 31:case 13:Dt=!1;return;case 27:case 3:Dt=!0;return;default:Fl=Fl.return}}function ha(l){if(l!==Fl)return!1;if(!cl)return Ns(l),cl=!0,!1;var t=l.tag,e;if((e=t!==3&&t!==27)&&((e=t===5)&&(e=l.type,e=!(e!=="form"&&e!=="button")||nf(l.type,l.memoizedProps)),e=!e),e&&_l&&ve(l),Ns(l),t===13){if(l=l.memoizedState,l=l!==null?l.dehydrated:null,!l)throw Error(r(317));_l=ed(l)}else if(t===31){if(l=l.memoizedState,l=l!==null?l.dehydrated:null,!l)throw Error(r(317));_l=ed(l)}else t===27?(t=_l,Ue(l.type)?(l=rf,rf=null,_l=l):_l=t):_l=Fl?Ct(l.stateNode.nextSibling):null;return!0}function Xe(){_l=Fl=null,cl=!1}function Xi(){var l=ye;return l!==null&&(rt===null?rt=l:rt.push.apply(rt,l),ye=null),l}function iu(l){ye===null?ye=[l]:ye.push(l)}var Zi=s(null),Ze=null,kt=null;function he(l,t,e){N(Zi,t._currentValue),t._currentValue=e}function Wt(l){l._currentValue=Zi.current,E(Zi)}function Vi(l,t,e){for(;l!==null;){var a=l.alternate;if((l.childLanes&t)!==t?(l.childLanes|=t,a!==null&&(a.childLanes|=t)):a!==null&&(a.childLanes&t)!==t&&(a.childLanes|=t),l===e)break;l=l.return}}function Ki(l,t,e,a){var u=l.child;for(u!==null&&(u.return=l);u!==null;){var n=u.dependencies;if(n!==null){var i=u.child;n=n.firstContext;l:for(;n!==null;){var c=n;n=u;for(var f=0;f<t.length;f++)if(c.context===t[f]){n.lanes|=e,c=n.alternate,c!==null&&(c.lanes|=e),Vi(n.return,e,l),a||(i=null);break l}n=c.next}}else if(u.tag===18){if(i=u.return,i===null)throw Error(r(341));i.lanes|=e,n=i.alternate,n!==null&&(n.lanes|=e),Vi(i,e,l),i=null}else i=u.child;if(i!==null)i.return=u;else for(i=u;i!==null;){if(i===l){i=null;break}if(u=i.sibling,u!==null){u.return=i.return,i=u;break}i=i.return}u=i}}function ga(l,t,e,a){l=null;for(var u=t,n=!1;u!==null;){if(!n){if((u.flags&524288)!==0)n=!0;else if((u.flags&262144)!==0)break}if(u.tag===10){var i=u.alternate;if(i===null)throw Error(r(387));if(i=i.memoizedProps,i!==null){var c=u.type;gt(u.pendingProps.value,i.value)||(l!==null?l.push(c):l=[c])}}else if(u===I.current){if(i=u.alternate,i===null)throw Error(r(387));i.memoizedState.memoizedState!==u.memoizedState.memoizedState&&(l!==null?l.push(Cu):l=[Cu])}u=u.return}l!==null&&Ki(t,l,e,a),t.flags|=262144}function rn(l){for(l=l.firstContext;l!==null;){if(!gt(l.context._currentValue,l.memoizedValue))return!0;l=l.next}return!1}function Ve(l){Ze=l,kt=null,l=l.dependencies,l!==null&&(l.firstContext=null)}function Pl(l){return Ds(Ze,l)}function dn(l,t){return Ze===null&&Ve(l),Ds(l,t)}function Ds(l,t){var e=t._currentValue;if(t={context:t,memoizedValue:e,next:null},kt===null){if(l===null)throw Error(r(308));kt=t,l.dependencies={lanes:0,firstContext:t},l.flags|=524288}else kt=kt.next=t;return e}var V0=typeof AbortController<"u"?AbortController:function(){var l=[],t=this.signal={aborted:!1,addEventListener:function(e,a){l.push(a)}};this.abort=function(){t.aborted=!0,l.forEach(function(e){return e()})}},K0=b.unstable_scheduleCallback,w0=b.unstable_NormalPriority,Gl={$$typeof:Al,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function wi(){return{controller:new V0,data:new Map,refCount:0}}function cu(l){l.refCount--,l.refCount===0&&K0(w0,function(){l.controller.abort()})}var fu=null,Ji=0,ba=0,Sa=null;function J0(l,t){if(fu===null){var e=fu=[];Ji=0,ba=Wc(),Sa={status:"pending",value:void 0,then:function(a){e.push(a)}}}return Ji++,t.then(js,js),t}function js(){if(--Ji===0&&fu!==null){Sa!==null&&(Sa.status="fulfilled");var l=fu;fu=null,ba=0,Sa=null;for(var t=0;t<l.length;t++)(0,l[t])()}}function $0(l,t){var e=[],a={status:"pending",value:null,reason:null,then:function(u){e.push(u)}};return l.then(function(){a.status="fulfilled",a.value=t;for(var u=0;u<e.length;u++)(0,e[u])(t)},function(u){for(a.status="rejected",a.reason=u,u=0;u<e.length;u++)(0,e[u])(void 0)}),a}var Cs=p.S;p.S=function(l,t){gr=al(),typeof t=="object"&&t!==null&&typeof t.then=="function"&&J0(l,t),Cs!==null&&Cs(l,t)};var Ke=s(null);function $i(){var l=Ke.current;return l!==null?l:El.pooledCache}function mn(l,t){t===null?N(Ke,Ke.current):N(Ke,t.pool)}function Hs(){var l=$i();return l===null?null:{parent:Gl._currentValue,pool:l}}var pa=Error(r(460)),ki=Error(r(474)),yn=Error(r(542)),vn={then:function(){}};function Rs(l){return l=l.status,l==="fulfilled"||l==="rejected"}function Bs(l,t,e){switch(e=l[e],e===void 0?l.push(t):e!==t&&(t.then(Kt,Kt),t=e),t.status){case"fulfilled":return t.value;case"rejected":throw l=t.reason,Ys(l),l;default:if(typeof t.status=="string")t.then(Kt,Kt);else{if(l=El,l!==null&&100<l.shellSuspendCounter)throw Error(r(482));l=t,l.status="pending",l.then(function(a){if(t.status==="pending"){var u=t;u.status="fulfilled",u.value=a}},function(a){if(t.status==="pending"){var u=t;u.status="rejected",u.reason=a}})}switch(t.status){case"fulfilled":return t.value;case"rejected":throw l=t.reason,Ys(l),l}throw Je=t,pa}}function we(l){try{var t=l._init;return t(l._payload)}catch(e){throw e!==null&&typeof e=="object"&&typeof e.then=="function"?(Je=e,pa):e}}var Je=null;function qs(){if(Je===null)throw Error(r(459));var l=Je;return Je=null,l}function Ys(l){if(l===pa||l===yn)throw Error(r(483))}var Ea=null,su=0;function hn(l){var t=su;return su+=1,Ea===null&&(Ea=[]),Bs(Ea,l,t)}function ou(l,t){t=t.props.ref,l.ref=t!==void 0?t:null}function gn(l,t){throw t.$$typeof===Z?Error(r(525)):(l=Object.prototype.toString.call(t),Error(r(31,l==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":l)))}function Gs(l){function t(d,o){if(l){var m=d.deletions;m===null?(d.deletions=[o],d.flags|=16):m.push(o)}}function e(d,o){if(!l)return null;for(;o!==null;)t(d,o),o=o.sibling;return null}function a(d){for(var o=new Map;d!==null;)d.key!==null?o.set(d.key,d):o.set(d.index,d),d=d.sibling;return o}function u(d,o){return d=Jt(d,o),d.index=0,d.sibling=null,d}function n(d,o,m){return d.index=m,l?(m=d.alternate,m!==null?(m=m.index,m<o?(d.flags|=67108866,o):m):(d.flags|=67108866,o)):(d.flags|=1048576,o)}function i(d){return l&&d.alternate===null&&(d.flags|=67108866),d}function c(d,o,m,A){return o===null||o.tag!==6?(o=qi(m,d.mode,A),o.return=d,o):(o=u(o,m),o.return=d,o)}function f(d,o,m,A){var Q=m.type;return Q===fl?T(d,o,m.props.children,A,m.key):o!==null&&(o.elementType===Q||typeof Q=="object"&&Q!==null&&Q.$$typeof===el&&we(Q)===o.type)?(o=u(o,m.props),ou(o,m),o.return=d,o):(o=sn(m.type,m.key,m.props,null,d.mode,A),ou(o,m),o.return=d,o)}function y(d,o,m,A){return o===null||o.tag!==4||o.stateNode.containerInfo!==m.containerInfo||o.stateNode.implementation!==m.implementation?(o=Yi(m,d.mode,A),o.return=d,o):(o=u(o,m.children||[]),o.return=d,o)}function T(d,o,m,A,Q){return o===null||o.tag!==7?(o=Qe(m,d.mode,A,Q),o.return=d,o):(o=u(o,m),o.return=d,o)}function _(d,o,m){if(typeof o=="string"&&o!==""||typeof o=="number"||typeof o=="bigint")return o=qi(""+o,d.mode,m),o.return=d,o;if(typeof o=="object"&&o!==null){switch(o.$$typeof){case Tl:return m=sn(o.type,o.key,o.props,null,d.mode,m),ou(m,o),m.return=d,m;case vl:return o=Yi(o,d.mode,m),o.return=d,o;case el:return o=we(o),_(d,o,m)}if(Kl(o)||zl(o))return o=Qe(o,d.mode,m,null),o.return=d,o;if(typeof o.then=="function")return _(d,hn(o),m);if(o.$$typeof===Al)return _(d,dn(d,o),m);gn(d,o)}return null}function h(d,o,m,A){var Q=o!==null?o.key:null;if(typeof m=="string"&&m!==""||typeof m=="number"||typeof m=="bigint")return Q!==null?null:c(d,o,""+m,A);if(typeof m=="object"&&m!==null){switch(m.$$typeof){case Tl:return m.key===Q?f(d,o,m,A):null;case vl:return m.key===Q?y(d,o,m,A):null;case el:return m=we(m),h(d,o,m,A)}if(Kl(m)||zl(m))return Q!==null?null:T(d,o,m,A,null);if(typeof m.then=="function")return h(d,o,hn(m),A);if(m.$$typeof===Al)return h(d,o,dn(d,m),A);gn(d,m)}return null}function S(d,o,m,A,Q){if(typeof A=="string"&&A!==""||typeof A=="number"||typeof A=="bigint")return d=d.get(m)||null,c(o,d,""+A,Q);if(typeof A=="object"&&A!==null){switch(A.$$typeof){case Tl:return d=d.get(A.key===null?m:A.key)||null,f(o,d,A,Q);case vl:return d=d.get(A.key===null?m:A.key)||null,y(o,d,A,Q);case el:return A=we(A),S(d,o,m,A,Q)}if(Kl(A)||zl(A))return d=d.get(m)||null,T(o,d,A,Q,null);if(typeof A.then=="function")return S(d,o,m,hn(A),Q);if(A.$$typeof===Al)return S(d,o,m,dn(o,A),Q);gn(o,A)}return null}function q(d,o,m,A){for(var Q=null,sl=null,Y=o,F=o=0,nl=null;Y!==null&&F<m.length;F++){Y.index>F?(nl=Y,Y=null):nl=Y.sibling;var ol=h(d,Y,m[F],A);if(ol===null){Y===null&&(Y=nl);break}l&&Y&&ol.alternate===null&&t(d,Y),o=n(ol,o,F),sl===null?Q=ol:sl.sibling=ol,sl=ol,Y=nl}if(F===m.length)return e(d,Y),cl&&$t(d,F),Q;if(Y===null){for(;F<m.length;F++)Y=_(d,m[F],A),Y!==null&&(o=n(Y,o,F),sl===null?Q=Y:sl.sibling=Y,sl=Y);return cl&&$t(d,F),Q}for(Y=a(Y);F<m.length;F++)nl=S(Y,d,F,m[F],A),nl!==null&&(l&&nl.alternate!==null&&Y.delete(nl.key===null?F:nl.key),o=n(nl,o,F),sl===null?Q=nl:sl.sibling=nl,sl=nl);return l&&Y.forEach(function(He){return t(d,He)}),cl&&$t(d,F),Q}function V(d,o,m,A){if(m==null)throw Error(r(151));for(var Q=null,sl=null,Y=o,F=o=0,nl=null,ol=m.next();Y!==null&&!ol.done;F++,ol=m.next()){Y.index>F?(nl=Y,Y=null):nl=Y.sibling;var He=h(d,Y,ol.value,A);if(He===null){Y===null&&(Y=nl);break}l&&Y&&He.alternate===null&&t(d,Y),o=n(He,o,F),sl===null?Q=He:sl.sibling=He,sl=He,Y=nl}if(ol.done)return e(d,Y),cl&&$t(d,F),Q;if(Y===null){for(;!ol.done;F++,ol=m.next())ol=_(d,ol.value,A),ol!==null&&(o=n(ol,o,F),sl===null?Q=ol:sl.sibling=ol,sl=ol);return cl&&$t(d,F),Q}for(Y=a(Y);!ol.done;F++,ol=m.next())ol=S(Y,d,F,ol.value,A),ol!==null&&(l&&ol.alternate!==null&&Y.delete(ol.key===null?F:ol.key),o=n(ol,o,F),sl===null?Q=ol:sl.sibling=ol,sl=ol);return l&&Y.forEach(function(ny){return t(d,ny)}),cl&&$t(d,F),Q}function Sl(d,o,m,A){if(typeof m=="object"&&m!==null&&m.type===fl&&m.key===null&&(m=m.props.children),typeof m=="object"&&m!==null){switch(m.$$typeof){case Tl:l:{for(var Q=m.key;o!==null;){if(o.key===Q){if(Q=m.type,Q===fl){if(o.tag===7){e(d,o.sibling),A=u(o,m.props.children),A.return=d,d=A;break l}}else if(o.elementType===Q||typeof Q=="object"&&Q!==null&&Q.$$typeof===el&&we(Q)===o.type){e(d,o.sibling),A=u(o,m.props),ou(A,m),A.return=d,d=A;break l}e(d,o);break}else t(d,o);o=o.sibling}m.type===fl?(A=Qe(m.props.children,d.mode,A,m.key),A.return=d,d=A):(A=sn(m.type,m.key,m.props,null,d.mode,A),ou(A,m),A.return=d,d=A)}return i(d);case vl:l:{for(Q=m.key;o!==null;){if(o.key===Q)if(o.tag===4&&o.stateNode.containerInfo===m.containerInfo&&o.stateNode.implementation===m.implementation){e(d,o.sibling),A=u(o,m.children||[]),A.return=d,d=A;break l}else{e(d,o);break}else t(d,o);o=o.sibling}A=Yi(m,d.mode,A),A.return=d,d=A}return i(d);case el:return m=we(m),Sl(d,o,m,A)}if(Kl(m))return q(d,o,m,A);if(zl(m)){if(Q=zl(m),typeof Q!="function")throw Error(r(150));return m=Q.call(m),V(d,o,m,A)}if(typeof m.then=="function")return Sl(d,o,hn(m),A);if(m.$$typeof===Al)return Sl(d,o,dn(d,m),A);gn(d,m)}return typeof m=="string"&&m!==""||typeof m=="number"||typeof m=="bigint"?(m=""+m,o!==null&&o.tag===6?(e(d,o.sibling),A=u(o,m),A.return=d,d=A):(e(d,o),A=qi(m,d.mode,A),A.return=d,d=A),i(d)):e(d,o)}return function(d,o,m,A){try{su=0;var Q=Sl(d,o,m,A);return Ea=null,Q}catch(Y){if(Y===pa||Y===yn)throw Y;var sl=bt(29,Y,null,d.mode);return sl.lanes=A,sl.return=d,sl}finally{}}}var $e=Gs(!0),Ls=Gs(!1),ge=!1;function Wi(l){l.updateQueue={baseState:l.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function Fi(l,t){l=l.updateQueue,t.updateQueue===l&&(t.updateQueue={baseState:l.baseState,firstBaseUpdate:l.firstBaseUpdate,lastBaseUpdate:l.lastBaseUpdate,shared:l.shared,callbacks:null})}function be(l){return{lane:l,tag:0,payload:null,callback:null,next:null}}function Se(l,t,e){var a=l.updateQueue;if(a===null)return null;if(a=a.shared,(rl&2)!==0){var u=a.pending;return u===null?t.next=t:(t.next=u.next,u.next=t),a.pending=t,t=fn(l),Ts(l,null,e),t}return cn(l,a,t,e),fn(l)}function ru(l,t,e){if(t=t.updateQueue,t!==null&&(t=t.shared,(e&4194048)!==0)){var a=t.lanes;a&=l.pendingLanes,e|=a,t.lanes=e,Df(l,e)}}function Pi(l,t){var e=l.updateQueue,a=l.alternate;if(a!==null&&(a=a.updateQueue,e===a)){var u=null,n=null;if(e=e.firstBaseUpdate,e!==null){do{var i={lane:e.lane,tag:e.tag,payload:e.payload,callback:null,next:null};n===null?u=n=i:n=n.next=i,e=e.next}while(e!==null);n===null?u=n=t:n=n.next=t}else u=n=t;e={baseState:a.baseState,firstBaseUpdate:u,lastBaseUpdate:n,shared:a.shared,callbacks:a.callbacks},l.updateQueue=e;return}l=e.lastBaseUpdate,l===null?e.firstBaseUpdate=t:l.next=t,e.lastBaseUpdate=t}var Ii=!1;function du(){if(Ii){var l=Sa;if(l!==null)throw l}}function mu(l,t,e,a){Ii=!1;var u=l.updateQueue;ge=!1;var n=u.firstBaseUpdate,i=u.lastBaseUpdate,c=u.shared.pending;if(c!==null){u.shared.pending=null;var f=c,y=f.next;f.next=null,i===null?n=y:i.next=y,i=f;var T=l.alternate;T!==null&&(T=T.updateQueue,c=T.lastBaseUpdate,c!==i&&(c===null?T.firstBaseUpdate=y:c.next=y,T.lastBaseUpdate=f))}if(n!==null){var _=u.baseState;i=0,T=y=f=null,c=n;do{var h=c.lane&-536870913,S=h!==c.lane;if(S?(ul&h)===h:(a&h)===h){h!==0&&h===ba&&(Ii=!0),T!==null&&(T=T.next={lane:0,tag:c.tag,payload:c.payload,callback:null,next:null});l:{var q=l,V=c;h=t;var Sl=e;switch(V.tag){case 1:if(q=V.payload,typeof q=="function"){_=q.call(Sl,_,h);break l}_=q;break l;case 3:q.flags=q.flags&-65537|128;case 0:if(q=V.payload,h=typeof q=="function"?q.call(Sl,_,h):q,h==null)break l;_=R({},_,h);break l;case 2:ge=!0}}h=c.callback,h!==null&&(l.flags|=64,S&&(l.flags|=8192),S=u.callbacks,S===null?u.callbacks=[h]:S.push(h))}else S={lane:h,tag:c.tag,payload:c.payload,callback:c.callback,next:null},T===null?(y=T=S,f=_):T=T.next=S,i|=h;if(c=c.next,c===null){if(c=u.shared.pending,c===null)break;S=c,c=S.next,S.next=null,u.lastBaseUpdate=S,u.shared.pending=null}}while(!0);T===null&&(f=_),u.baseState=f,u.firstBaseUpdate=y,u.lastBaseUpdate=T,n===null&&(u.shared.lanes=0),Ae|=i,l.lanes=i,l.memoizedState=_}}function Qs(l,t){if(typeof l!="function")throw Error(r(191,l));l.call(t)}function Xs(l,t){var e=l.callbacks;if(e!==null)for(l.callbacks=null,l=0;l<e.length;l++)Qs(e[l],t)}var za=s(null),bn=s(0);function Zs(l,t){l=ne,N(bn,l),N(za,t),ne=l|t.baseLanes}function lc(){N(bn,ne),N(za,za.current)}function tc(){ne=bn.current,E(za),E(bn)}var St=s(null),jt=null;function pe(l){var t=l.alternate;N(Rl,Rl.current&1),N(St,l),jt===null&&(t===null||za.current!==null||t.memoizedState!==null)&&(jt=l)}function ec(l){N(Rl,Rl.current),N(St,l),jt===null&&(jt=l)}function Vs(l){l.tag===22?(N(Rl,Rl.current),N(St,l),jt===null&&(jt=l)):Ee()}function Ee(){N(Rl,Rl.current),N(St,St.current)}function pt(l){E(St),jt===l&&(jt=null),E(Rl)}var Rl=s(0);function Sn(l){for(var t=l;t!==null;){if(t.tag===13){var e=t.memoizedState;if(e!==null&&(e=e.dehydrated,e===null||sf(e)||of(e)))return t}else if(t.tag===19&&(t.memoizedProps.revealOrder==="forwards"||t.memoizedProps.revealOrder==="backwards"||t.memoizedProps.revealOrder==="unstable_legacy-backwards"||t.memoizedProps.revealOrder==="together")){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===l)break;for(;t.sibling===null;){if(t.return===null||t.return===l)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var Ft=0,W=null,gl=null,Ll=null,pn=!1,Ta=!1,ke=!1,En=0,yu=0,Aa=null,k0=0;function Cl(){throw Error(r(321))}function ac(l,t){if(t===null)return!1;for(var e=0;e<t.length&&e<l.length;e++)if(!gt(l[e],t[e]))return!1;return!0}function uc(l,t,e,a,u,n){return Ft=n,W=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,p.H=l===null||l.memoizedState===null?Mo:Sc,ke=!1,n=e(a,u),ke=!1,Ta&&(n=ws(t,e,a,u)),Ks(l),n}function Ks(l){p.H=gu;var t=gl!==null&&gl.next!==null;if(Ft=0,Ll=gl=W=null,pn=!1,yu=0,Aa=null,t)throw Error(r(300));l===null||Ql||(l=l.dependencies,l!==null&&rn(l)&&(Ql=!0))}function ws(l,t,e,a){W=l;var u=0;do{if(Ta&&(Aa=null),yu=0,Ta=!1,25<=u)throw Error(r(301));if(u+=1,Ll=gl=null,l.updateQueue!=null){var n=l.updateQueue;n.lastEffect=null,n.events=null,n.stores=null,n.memoCache!=null&&(n.memoCache.index=0)}p.H=Uo,n=t(e,a)}while(Ta);return n}function W0(){var l=p.H,t=l.useState()[0];return t=typeof t.then=="function"?vu(t):t,l=l.useState()[0],(gl!==null?gl.memoizedState:null)!==l&&(W.flags|=1024),t}function nc(){var l=En!==0;return En=0,l}function ic(l,t,e){t.updateQueue=l.updateQueue,t.flags&=-2053,l.lanes&=~e}function cc(l){if(pn){for(l=l.memoizedState;l!==null;){var t=l.queue;t!==null&&(t.pending=null),l=l.next}pn=!1}Ft=0,Ll=gl=W=null,Ta=!1,yu=En=0,Aa=null}function at(){var l={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Ll===null?W.memoizedState=Ll=l:Ll=Ll.next=l,Ll}function Bl(){if(gl===null){var l=W.alternate;l=l!==null?l.memoizedState:null}else l=gl.next;var t=Ll===null?W.memoizedState:Ll.next;if(t!==null)Ll=t,gl=l;else{if(l===null)throw W.alternate===null?Error(r(467)):Error(r(310));gl=l,l={memoizedState:gl.memoizedState,baseState:gl.baseState,baseQueue:gl.baseQueue,queue:gl.queue,next:null},Ll===null?W.memoizedState=Ll=l:Ll=Ll.next=l}return Ll}function zn(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function vu(l){var t=yu;return yu+=1,Aa===null&&(Aa=[]),l=Bs(Aa,l,t),t=W,(Ll===null?t.memoizedState:Ll.next)===null&&(t=t.alternate,p.H=t===null||t.memoizedState===null?Mo:Sc),l}function Tn(l){if(l!==null&&typeof l=="object"){if(typeof l.then=="function")return vu(l);if(l.$$typeof===Al)return Pl(l)}throw Error(r(438,String(l)))}function fc(l){var t=null,e=W.updateQueue;if(e!==null&&(t=e.memoCache),t==null){var a=W.alternate;a!==null&&(a=a.updateQueue,a!==null&&(a=a.memoCache,a!=null&&(t={data:a.data.map(function(u){return u.slice()}),index:0})))}if(t==null&&(t={data:[],index:0}),e===null&&(e=zn(),W.updateQueue=e),e.memoCache=t,e=t.data[t.index],e===void 0)for(e=t.data[t.index]=Array(l),a=0;a<l;a++)e[a]=tt;return t.index++,e}function Pt(l,t){return typeof t=="function"?t(l):t}function An(l){var t=Bl();return sc(t,gl,l)}function sc(l,t,e){var a=l.queue;if(a===null)throw Error(r(311));a.lastRenderedReducer=e;var u=l.baseQueue,n=a.pending;if(n!==null){if(u!==null){var i=u.next;u.next=n.next,n.next=i}t.baseQueue=u=n,a.pending=null}if(n=l.baseState,u===null)l.memoizedState=n;else{t=u.next;var c=i=null,f=null,y=t,T=!1;do{var _=y.lane&-536870913;if(_!==y.lane?(ul&_)===_:(Ft&_)===_){var h=y.revertLane;if(h===0)f!==null&&(f=f.next={lane:0,revertLane:0,gesture:null,action:y.action,hasEagerState:y.hasEagerState,eagerState:y.eagerState,next:null}),_===ba&&(T=!0);else if((Ft&h)===h){y=y.next,h===ba&&(T=!0);continue}else _={lane:0,revertLane:y.revertLane,gesture:null,action:y.action,hasEagerState:y.hasEagerState,eagerState:y.eagerState,next:null},f===null?(c=f=_,i=n):f=f.next=_,W.lanes|=h,Ae|=h;_=y.action,ke&&e(n,_),n=y.hasEagerState?y.eagerState:e(n,_)}else h={lane:_,revertLane:y.revertLane,gesture:y.gesture,action:y.action,hasEagerState:y.hasEagerState,eagerState:y.eagerState,next:null},f===null?(c=f=h,i=n):f=f.next=h,W.lanes|=_,Ae|=_;y=y.next}while(y!==null&&y!==t);if(f===null?i=n:f.next=c,!gt(n,l.memoizedState)&&(Ql=!0,T&&(e=Sa,e!==null)))throw e;l.memoizedState=n,l.baseState=i,l.baseQueue=f,a.lastRenderedState=n}return u===null&&(a.lanes=0),[l.memoizedState,a.dispatch]}function oc(l){var t=Bl(),e=t.queue;if(e===null)throw Error(r(311));e.lastRenderedReducer=l;var a=e.dispatch,u=e.pending,n=t.memoizedState;if(u!==null){e.pending=null;var i=u=u.next;do n=l(n,i.action),i=i.next;while(i!==u);gt(n,t.memoizedState)||(Ql=!0),t.memoizedState=n,t.baseQueue===null&&(t.baseState=n),e.lastRenderedState=n}return[n,a]}function Js(l,t,e){var a=W,u=Bl(),n=cl;if(n){if(e===void 0)throw Error(r(407));e=e()}else e=t();var i=!gt((gl||u).memoizedState,e);if(i&&(u.memoizedState=e,Ql=!0),u=u.queue,mc(Ws.bind(null,a,u,l),[l]),u.getSnapshot!==t||i||Ll!==null&&Ll.memoizedState.tag&1){if(a.flags|=2048,xa(9,{destroy:void 0},ks.bind(null,a,u,e,t),null),El===null)throw Error(r(349));n||(Ft&127)!==0||$s(a,t,e)}return e}function $s(l,t,e){l.flags|=16384,l={getSnapshot:t,value:e},t=W.updateQueue,t===null?(t=zn(),W.updateQueue=t,t.stores=[l]):(e=t.stores,e===null?t.stores=[l]:e.push(l))}function ks(l,t,e,a){t.value=e,t.getSnapshot=a,Fs(t)&&Ps(l)}function Ws(l,t,e){return e(function(){Fs(t)&&Ps(l)})}function Fs(l){var t=l.getSnapshot;l=l.value;try{var e=t();return!gt(l,e)}catch{return!0}}function Ps(l){var t=Le(l,2);t!==null&&dt(t,l,2)}function rc(l){var t=at();if(typeof l=="function"){var e=l;if(l=e(),ke){oe(!0);try{e()}finally{oe(!1)}}}return t.memoizedState=t.baseState=l,t.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Pt,lastRenderedState:l},t}function Is(l,t,e,a){return l.baseState=e,sc(l,gl,typeof a=="function"?a:Pt)}function F0(l,t,e,a,u){if(On(l))throw Error(r(485));if(l=t.action,l!==null){var n={payload:u,action:l,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(i){n.listeners.push(i)}};p.T!==null?e(!0):n.isTransition=!1,a(n),e=t.pending,e===null?(n.next=t.pending=n,lo(t,n)):(n.next=e.next,t.pending=e.next=n)}}function lo(l,t){var e=t.action,a=t.payload,u=l.state;if(t.isTransition){var n=p.T,i={};p.T=i;try{var c=e(u,a),f=p.S;f!==null&&f(i,c),to(l,t,c)}catch(y){dc(l,t,y)}finally{n!==null&&i.types!==null&&(n.types=i.types),p.T=n}}else try{n=e(u,a),to(l,t,n)}catch(y){dc(l,t,y)}}function to(l,t,e){e!==null&&typeof e=="object"&&typeof e.then=="function"?e.then(function(a){eo(l,t,a)},function(a){return dc(l,t,a)}):eo(l,t,e)}function eo(l,t,e){t.status="fulfilled",t.value=e,ao(t),l.state=e,t=l.pending,t!==null&&(e=t.next,e===t?l.pending=null:(e=e.next,t.next=e,lo(l,e)))}function dc(l,t,e){var a=l.pending;if(l.pending=null,a!==null){a=a.next;do t.status="rejected",t.reason=e,ao(t),t=t.next;while(t!==a)}l.action=null}function ao(l){l=l.listeners;for(var t=0;t<l.length;t++)(0,l[t])()}function uo(l,t){return t}function no(l,t){if(cl){var e=El.formState;if(e!==null){l:{var a=W;if(cl){if(_l){t:{for(var u=_l,n=Dt;u.nodeType!==8;){if(!n){u=null;break t}if(u=Ct(u.nextSibling),u===null){u=null;break t}}n=u.data,u=n==="F!"||n==="F"?u:null}if(u){_l=Ct(u.nextSibling),a=u.data==="F!";break l}}ve(a)}a=!1}a&&(t=e[0])}}return e=at(),e.memoizedState=e.baseState=t,a={pending:null,lanes:0,dispatch:null,lastRenderedReducer:uo,lastRenderedState:t},e.queue=a,e=xo.bind(null,W,a),a.dispatch=e,a=rc(!1),n=bc.bind(null,W,!1,a.queue),a=at(),u={state:t,dispatch:null,action:l,pending:null},a.queue=u,e=F0.bind(null,W,u,n,e),u.dispatch=e,a.memoizedState=l,[t,e,!1]}function io(l){var t=Bl();return co(t,gl,l)}function co(l,t,e){if(t=sc(l,t,uo)[0],l=An(Pt)[0],typeof t=="object"&&t!==null&&typeof t.then=="function")try{var a=vu(t)}catch(i){throw i===pa?yn:i}else a=t;t=Bl();var u=t.queue,n=u.dispatch;return e!==t.memoizedState&&(W.flags|=2048,xa(9,{destroy:void 0},P0.bind(null,u,e),null)),[a,n,l]}function P0(l,t){l.action=t}function fo(l){var t=Bl(),e=gl;if(e!==null)return co(t,e,l);Bl(),t=t.memoizedState,e=Bl();var a=e.queue.dispatch;return e.memoizedState=l,[t,a,!1]}function xa(l,t,e,a){return l={tag:l,create:e,deps:a,inst:t,next:null},t=W.updateQueue,t===null&&(t=zn(),W.updateQueue=t),e=t.lastEffect,e===null?t.lastEffect=l.next=l:(a=e.next,e.next=l,l.next=a,t.lastEffect=l),l}function so(){return Bl().memoizedState}function xn(l,t,e,a){var u=at();W.flags|=l,u.memoizedState=xa(1|t,{destroy:void 0},e,a===void 0?null:a)}function _n(l,t,e,a){var u=Bl();a=a===void 0?null:a;var n=u.memoizedState.inst;gl!==null&&a!==null&&ac(a,gl.memoizedState.deps)?u.memoizedState=xa(t,n,e,a):(W.flags|=l,u.memoizedState=xa(1|t,n,e,a))}function oo(l,t){xn(8390656,8,l,t)}function mc(l,t){_n(2048,8,l,t)}function I0(l){W.flags|=4;var t=W.updateQueue;if(t===null)t=zn(),W.updateQueue=t,t.events=[l];else{var e=t.events;e===null?t.events=[l]:e.push(l)}}function ro(l){var t=Bl().memoizedState;return I0({ref:t,nextImpl:l}),function(){if((rl&2)!==0)throw Error(r(440));return t.impl.apply(void 0,arguments)}}function mo(l,t){return _n(4,2,l,t)}function yo(l,t){return _n(4,4,l,t)}function vo(l,t){if(typeof t=="function"){l=l();var e=t(l);return function(){typeof e=="function"?e():t(null)}}if(t!=null)return l=l(),t.current=l,function(){t.current=null}}function ho(l,t,e){e=e!=null?e.concat([l]):null,_n(4,4,vo.bind(null,t,l),e)}function yc(){}function go(l,t){var e=Bl();t=t===void 0?null:t;var a=e.memoizedState;return t!==null&&ac(t,a[1])?a[0]:(e.memoizedState=[l,t],l)}function bo(l,t){var e=Bl();t=t===void 0?null:t;var a=e.memoizedState;if(t!==null&&ac(t,a[1]))return a[0];if(a=l(),ke){oe(!0);try{l()}finally{oe(!1)}}return e.memoizedState=[a,t],a}function vc(l,t,e){return e===void 0||(Ft&1073741824)!==0&&(ul&261930)===0?l.memoizedState=t:(l.memoizedState=e,l=Sr(),W.lanes|=l,Ae|=l,e)}function So(l,t,e,a){return gt(e,t)?e:za.current!==null?(l=vc(l,e,a),gt(l,t)||(Ql=!0),l):(Ft&42)===0||(Ft&1073741824)!==0&&(ul&261930)===0?(Ql=!0,l.memoizedState=e):(l=Sr(),W.lanes|=l,Ae|=l,t)}function po(l,t,e,a,u){var n=D.p;D.p=n!==0&&8>n?n:8;var i=p.T,c={};p.T=c,bc(l,!1,t,e);try{var f=u(),y=p.S;if(y!==null&&y(c,f),f!==null&&typeof f=="object"&&typeof f.then=="function"){var T=$0(f,a);hu(l,t,T,Tt(l))}else hu(l,t,a,Tt(l))}catch(_){hu(l,t,{then:function(){},status:"rejected",reason:_},Tt())}finally{D.p=n,i!==null&&c.types!==null&&(i.types=c.types),p.T=i}}function lm(){}function hc(l,t,e,a){if(l.tag!==5)throw Error(r(476));var u=Eo(l).queue;po(l,u,t,X,e===null?lm:function(){return zo(l),e(a)})}function Eo(l){var t=l.memoizedState;if(t!==null)return t;t={memoizedState:X,baseState:X,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Pt,lastRenderedState:X},next:null};var e={};return t.next={memoizedState:e,baseState:e,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Pt,lastRenderedState:e},next:null},l.memoizedState=t,l=l.alternate,l!==null&&(l.memoizedState=t),t}function zo(l){var t=Eo(l);t.next===null&&(t=l.alternate.memoizedState),hu(l,t.next.queue,{},Tt())}function gc(){return Pl(Cu)}function To(){return Bl().memoizedState}function Ao(){return Bl().memoizedState}function tm(l){for(var t=l.return;t!==null;){switch(t.tag){case 24:case 3:var e=Tt();l=be(e);var a=Se(t,l,e);a!==null&&(dt(a,t,e),ru(a,t,e)),t={cache:wi()},l.payload=t;return}t=t.return}}function em(l,t,e){var a=Tt();e={lane:a,revertLane:0,gesture:null,action:e,hasEagerState:!1,eagerState:null,next:null},On(l)?_o(t,e):(e=Ri(l,t,e,a),e!==null&&(dt(e,l,a),Oo(e,t,a)))}function xo(l,t,e){var a=Tt();hu(l,t,e,a)}function hu(l,t,e,a){var u={lane:a,revertLane:0,gesture:null,action:e,hasEagerState:!1,eagerState:null,next:null};if(On(l))_o(t,u);else{var n=l.alternate;if(l.lanes===0&&(n===null||n.lanes===0)&&(n=t.lastRenderedReducer,n!==null))try{var i=t.lastRenderedState,c=n(i,e);if(u.hasEagerState=!0,u.eagerState=c,gt(c,i))return cn(l,t,u,0),El===null&&nn(),!1}catch{}finally{}if(e=Ri(l,t,u,a),e!==null)return dt(e,l,a),Oo(e,t,a),!0}return!1}function bc(l,t,e,a){if(a={lane:2,revertLane:Wc(),gesture:null,action:a,hasEagerState:!1,eagerState:null,next:null},On(l)){if(t)throw Error(r(479))}else t=Ri(l,e,a,2),t!==null&&dt(t,l,2)}function On(l){var t=l.alternate;return l===W||t!==null&&t===W}function _o(l,t){Ta=pn=!0;var e=l.pending;e===null?t.next=t:(t.next=e.next,e.next=t),l.pending=t}function Oo(l,t,e){if((e&4194048)!==0){var a=t.lanes;a&=l.pendingLanes,e|=a,t.lanes=e,Df(l,e)}}var gu={readContext:Pl,use:Tn,useCallback:Cl,useContext:Cl,useEffect:Cl,useImperativeHandle:Cl,useLayoutEffect:Cl,useInsertionEffect:Cl,useMemo:Cl,useReducer:Cl,useRef:Cl,useState:Cl,useDebugValue:Cl,useDeferredValue:Cl,useTransition:Cl,useSyncExternalStore:Cl,useId:Cl,useHostTransitionStatus:Cl,useFormState:Cl,useActionState:Cl,useOptimistic:Cl,useMemoCache:Cl,useCacheRefresh:Cl};gu.useEffectEvent=Cl;var Mo={readContext:Pl,use:Tn,useCallback:function(l,t){return at().memoizedState=[l,t===void 0?null:t],l},useContext:Pl,useEffect:oo,useImperativeHandle:function(l,t,e){e=e!=null?e.concat([l]):null,xn(4194308,4,vo.bind(null,t,l),e)},useLayoutEffect:function(l,t){return xn(4194308,4,l,t)},useInsertionEffect:function(l,t){xn(4,2,l,t)},useMemo:function(l,t){var e=at();t=t===void 0?null:t;var a=l();if(ke){oe(!0);try{l()}finally{oe(!1)}}return e.memoizedState=[a,t],a},useReducer:function(l,t,e){var a=at();if(e!==void 0){var u=e(t);if(ke){oe(!0);try{e(t)}finally{oe(!1)}}}else u=t;return a.memoizedState=a.baseState=u,l={pending:null,lanes:0,dispatch:null,lastRenderedReducer:l,lastRenderedState:u},a.queue=l,l=l.dispatch=em.bind(null,W,l),[a.memoizedState,l]},useRef:function(l){var t=at();return l={current:l},t.memoizedState=l},useState:function(l){l=rc(l);var t=l.queue,e=xo.bind(null,W,t);return t.dispatch=e,[l.memoizedState,e]},useDebugValue:yc,useDeferredValue:function(l,t){var e=at();return vc(e,l,t)},useTransition:function(){var l=rc(!1);return l=po.bind(null,W,l.queue,!0,!1),at().memoizedState=l,[!1,l]},useSyncExternalStore:function(l,t,e){var a=W,u=at();if(cl){if(e===void 0)throw Error(r(407));e=e()}else{if(e=t(),El===null)throw Error(r(349));(ul&127)!==0||$s(a,t,e)}u.memoizedState=e;var n={value:e,getSnapshot:t};return u.queue=n,oo(Ws.bind(null,a,n,l),[l]),a.flags|=2048,xa(9,{destroy:void 0},ks.bind(null,a,n,e,t),null),e},useId:function(){var l=at(),t=El.identifierPrefix;if(cl){var e=Qt,a=Lt;e=(a&~(1<<32-ht(a)-1)).toString(32)+e,t="_"+t+"R_"+e,e=En++,0<e&&(t+="H"+e.toString(32)),t+="_"}else e=k0++,t="_"+t+"r_"+e.toString(32)+"_";return l.memoizedState=t},useHostTransitionStatus:gc,useFormState:no,useActionState:no,useOptimistic:function(l){var t=at();t.memoizedState=t.baseState=l;var e={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return t.queue=e,t=bc.bind(null,W,!0,e),e.dispatch=t,[l,t]},useMemoCache:fc,useCacheRefresh:function(){return at().memoizedState=tm.bind(null,W)},useEffectEvent:function(l){var t=at(),e={impl:l};return t.memoizedState=e,function(){if((rl&2)!==0)throw Error(r(440));return e.impl.apply(void 0,arguments)}}},Sc={readContext:Pl,use:Tn,useCallback:go,useContext:Pl,useEffect:mc,useImperativeHandle:ho,useInsertionEffect:mo,useLayoutEffect:yo,useMemo:bo,useReducer:An,useRef:so,useState:function(){return An(Pt)},useDebugValue:yc,useDeferredValue:function(l,t){var e=Bl();return So(e,gl.memoizedState,l,t)},useTransition:function(){var l=An(Pt)[0],t=Bl().memoizedState;return[typeof l=="boolean"?l:vu(l),t]},useSyncExternalStore:Js,useId:To,useHostTransitionStatus:gc,useFormState:io,useActionState:io,useOptimistic:function(l,t){var e=Bl();return Is(e,gl,l,t)},useMemoCache:fc,useCacheRefresh:Ao};Sc.useEffectEvent=ro;var Uo={readContext:Pl,use:Tn,useCallback:go,useContext:Pl,useEffect:mc,useImperativeHandle:ho,useInsertionEffect:mo,useLayoutEffect:yo,useMemo:bo,useReducer:oc,useRef:so,useState:function(){return oc(Pt)},useDebugValue:yc,useDeferredValue:function(l,t){var e=Bl();return gl===null?vc(e,l,t):So(e,gl.memoizedState,l,t)},useTransition:function(){var l=oc(Pt)[0],t=Bl().memoizedState;return[typeof l=="boolean"?l:vu(l),t]},useSyncExternalStore:Js,useId:To,useHostTransitionStatus:gc,useFormState:fo,useActionState:fo,useOptimistic:function(l,t){var e=Bl();return gl!==null?Is(e,gl,l,t):(e.baseState=l,[l,e.queue.dispatch])},useMemoCache:fc,useCacheRefresh:Ao};Uo.useEffectEvent=ro;function pc(l,t,e,a){t=l.memoizedState,e=e(a,t),e=e==null?t:R({},t,e),l.memoizedState=e,l.lanes===0&&(l.updateQueue.baseState=e)}var Ec={enqueueSetState:function(l,t,e){l=l._reactInternals;var a=Tt(),u=be(a);u.payload=t,e!=null&&(u.callback=e),t=Se(l,u,a),t!==null&&(dt(t,l,a),ru(t,l,a))},enqueueReplaceState:function(l,t,e){l=l._reactInternals;var a=Tt(),u=be(a);u.tag=1,u.payload=t,e!=null&&(u.callback=e),t=Se(l,u,a),t!==null&&(dt(t,l,a),ru(t,l,a))},enqueueForceUpdate:function(l,t){l=l._reactInternals;var e=Tt(),a=be(e);a.tag=2,t!=null&&(a.callback=t),t=Se(l,a,e),t!==null&&(dt(t,l,e),ru(t,l,e))}};function No(l,t,e,a,u,n,i){return l=l.stateNode,typeof l.shouldComponentUpdate=="function"?l.shouldComponentUpdate(a,n,i):t.prototype&&t.prototype.isPureReactComponent?!au(e,a)||!au(u,n):!0}function Do(l,t,e,a){l=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(e,a),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(e,a),t.state!==l&&Ec.enqueueReplaceState(t,t.state,null)}function We(l,t){var e=t;if("ref"in t){e={};for(var a in t)a!=="ref"&&(e[a]=t[a])}if(l=l.defaultProps){e===t&&(e=R({},e));for(var u in l)e[u]===void 0&&(e[u]=l[u])}return e}function jo(l){un(l)}function Co(l){console.error(l)}function Ho(l){un(l)}function Mn(l,t){try{var e=l.onUncaughtError;e(t.value,{componentStack:t.stack})}catch(a){setTimeout(function(){throw a})}}function Ro(l,t,e){try{var a=l.onCaughtError;a(e.value,{componentStack:e.stack,errorBoundary:t.tag===1?t.stateNode:null})}catch(u){setTimeout(function(){throw u})}}function zc(l,t,e){return e=be(e),e.tag=3,e.payload={element:null},e.callback=function(){Mn(l,t)},e}function Bo(l){return l=be(l),l.tag=3,l}function qo(l,t,e,a){var u=e.type.getDerivedStateFromError;if(typeof u=="function"){var n=a.value;l.payload=function(){return u(n)},l.callback=function(){Ro(t,e,a)}}var i=e.stateNode;i!==null&&typeof i.componentDidCatch=="function"&&(l.callback=function(){Ro(t,e,a),typeof u!="function"&&(xe===null?xe=new Set([this]):xe.add(this));var c=a.stack;this.componentDidCatch(a.value,{componentStack:c!==null?c:""})})}function am(l,t,e,a,u){if(e.flags|=32768,a!==null&&typeof a=="object"&&typeof a.then=="function"){if(t=e.alternate,t!==null&&ga(t,e,u,!0),e=St.current,e!==null){switch(e.tag){case 31:case 13:return jt===null?Ln():e.alternate===null&&Hl===0&&(Hl=3),e.flags&=-257,e.flags|=65536,e.lanes=u,a===vn?e.flags|=16384:(t=e.updateQueue,t===null?e.updateQueue=new Set([a]):t.add(a),Jc(l,a,u)),!1;case 22:return e.flags|=65536,a===vn?e.flags|=16384:(t=e.updateQueue,t===null?(t={transitions:null,markerInstances:null,retryQueue:new Set([a])},e.updateQueue=t):(e=t.retryQueue,e===null?t.retryQueue=new Set([a]):e.add(a)),Jc(l,a,u)),!1}throw Error(r(435,e.tag))}return Jc(l,a,u),Ln(),!1}if(cl)return t=St.current,t!==null?((t.flags&65536)===0&&(t.flags|=256),t.flags|=65536,t.lanes=u,a!==Qi&&(l=Error(r(422),{cause:a}),iu(Mt(l,e)))):(a!==Qi&&(t=Error(r(423),{cause:a}),iu(Mt(t,e))),l=l.current.alternate,l.flags|=65536,u&=-u,l.lanes|=u,a=Mt(a,e),u=zc(l.stateNode,a,u),Pi(l,u),Hl!==4&&(Hl=2)),!1;var n=Error(r(520),{cause:a});if(n=Mt(n,e),xu===null?xu=[n]:xu.push(n),Hl!==4&&(Hl=2),t===null)return!0;a=Mt(a,e),e=t;do{switch(e.tag){case 3:return e.flags|=65536,l=u&-u,e.lanes|=l,l=zc(e.stateNode,a,l),Pi(e,l),!1;case 1:if(t=e.type,n=e.stateNode,(e.flags&128)===0&&(typeof t.getDerivedStateFromError=="function"||n!==null&&typeof n.componentDidCatch=="function"&&(xe===null||!xe.has(n))))return e.flags|=65536,u&=-u,e.lanes|=u,u=Bo(u),qo(u,l,e,a),Pi(e,u),!1}e=e.return}while(e!==null);return!1}var Tc=Error(r(461)),Ql=!1;function Il(l,t,e,a){t.child=l===null?Ls(t,null,e,a):$e(t,l.child,e,a)}function Yo(l,t,e,a,u){e=e.render;var n=t.ref;if("ref"in a){var i={};for(var c in a)c!=="ref"&&(i[c]=a[c])}else i=a;return Ve(t),a=uc(l,t,e,i,n,u),c=nc(),l!==null&&!Ql?(ic(l,t,u),It(l,t,u)):(cl&&c&&Gi(t),t.flags|=1,Il(l,t,a,u),t.child)}function Go(l,t,e,a,u){if(l===null){var n=e.type;return typeof n=="function"&&!Bi(n)&&n.defaultProps===void 0&&e.compare===null?(t.tag=15,t.type=n,Lo(l,t,n,a,u)):(l=sn(e.type,null,a,t,t.mode,u),l.ref=t.ref,l.return=t,t.child=l)}if(n=l.child,!Dc(l,u)){var i=n.memoizedProps;if(e=e.compare,e=e!==null?e:au,e(i,a)&&l.ref===t.ref)return It(l,t,u)}return t.flags|=1,l=Jt(n,a),l.ref=t.ref,l.return=t,t.child=l}function Lo(l,t,e,a,u){if(l!==null){var n=l.memoizedProps;if(au(n,a)&&l.ref===t.ref)if(Ql=!1,t.pendingProps=a=n,Dc(l,u))(l.flags&131072)!==0&&(Ql=!0);else return t.lanes=l.lanes,It(l,t,u)}return Ac(l,t,e,a,u)}function Qo(l,t,e,a){var u=a.children,n=l!==null?l.memoizedState:null;if(l===null&&t.stateNode===null&&(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),a.mode==="hidden"){if((t.flags&128)!==0){if(n=n!==null?n.baseLanes|e:e,l!==null){for(a=t.child=l.child,u=0;a!==null;)u=u|a.lanes|a.childLanes,a=a.sibling;a=u&~n}else a=0,t.child=null;return Xo(l,t,n,e,a)}if((e&536870912)!==0)t.memoizedState={baseLanes:0,cachePool:null},l!==null&&mn(t,n!==null?n.cachePool:null),n!==null?Zs(t,n):lc(),Vs(t);else return a=t.lanes=536870912,Xo(l,t,n!==null?n.baseLanes|e:e,e,a)}else n!==null?(mn(t,n.cachePool),Zs(t,n),Ee(),t.memoizedState=null):(l!==null&&mn(t,null),lc(),Ee());return Il(l,t,u,e),t.child}function bu(l,t){return l!==null&&l.tag===22||t.stateNode!==null||(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),t.sibling}function Xo(l,t,e,a,u){var n=$i();return n=n===null?null:{parent:Gl._currentValue,pool:n},t.memoizedState={baseLanes:e,cachePool:n},l!==null&&mn(t,null),lc(),Vs(t),l!==null&&ga(l,t,a,!0),t.childLanes=u,null}function Un(l,t){return t=Dn({mode:t.mode,children:t.children},l.mode),t.ref=l.ref,l.child=t,t.return=l,t}function Zo(l,t,e){return $e(t,l.child,null,e),l=Un(t,t.pendingProps),l.flags|=2,pt(t),t.memoizedState=null,l}function um(l,t,e){var a=t.pendingProps,u=(t.flags&128)!==0;if(t.flags&=-129,l===null){if(cl){if(a.mode==="hidden")return l=Un(t,a),t.lanes=536870912,bu(null,l);if(ec(t),(l=_l)?(l=td(l,Dt),l=l!==null&&l.data==="&"?l:null,l!==null&&(t.memoizedState={dehydrated:l,treeContext:me!==null?{id:Lt,overflow:Qt}:null,retryLane:536870912,hydrationErrors:null},e=xs(l),e.return=t,t.child=e,Fl=t,_l=null)):l=null,l===null)throw ve(t);return t.lanes=536870912,null}return Un(t,a)}var n=l.memoizedState;if(n!==null){var i=n.dehydrated;if(ec(t),u)if(t.flags&256)t.flags&=-257,t=Zo(l,t,e);else if(t.memoizedState!==null)t.child=l.child,t.flags|=128,t=null;else throw Error(r(558));else if(Ql||ga(l,t,e,!1),u=(e&l.childLanes)!==0,Ql||u){if(a=El,a!==null&&(i=jf(a,e),i!==0&&i!==n.retryLane))throw n.retryLane=i,Le(l,i),dt(a,l,i),Tc;Ln(),t=Zo(l,t,e)}else l=n.treeContext,_l=Ct(i.nextSibling),Fl=t,cl=!0,ye=null,Dt=!1,l!==null&&Ms(t,l),t=Un(t,a),t.flags|=4096;return t}return l=Jt(l.child,{mode:a.mode,children:a.children}),l.ref=t.ref,t.child=l,l.return=t,l}function Nn(l,t){var e=t.ref;if(e===null)l!==null&&l.ref!==null&&(t.flags|=4194816);else{if(typeof e!="function"&&typeof e!="object")throw Error(r(284));(l===null||l.ref!==e)&&(t.flags|=4194816)}}function Ac(l,t,e,a,u){return Ve(t),e=uc(l,t,e,a,void 0,u),a=nc(),l!==null&&!Ql?(ic(l,t,u),It(l,t,u)):(cl&&a&&Gi(t),t.flags|=1,Il(l,t,e,u),t.child)}function Vo(l,t,e,a,u,n){return Ve(t),t.updateQueue=null,e=ws(t,a,e,u),Ks(l),a=nc(),l!==null&&!Ql?(ic(l,t,n),It(l,t,n)):(cl&&a&&Gi(t),t.flags|=1,Il(l,t,e,n),t.child)}function Ko(l,t,e,a,u){if(Ve(t),t.stateNode===null){var n=ma,i=e.contextType;typeof i=="object"&&i!==null&&(n=Pl(i)),n=new e(a,n),t.memoizedState=n.state!==null&&n.state!==void 0?n.state:null,n.updater=Ec,t.stateNode=n,n._reactInternals=t,n=t.stateNode,n.props=a,n.state=t.memoizedState,n.refs={},Wi(t),i=e.contextType,n.context=typeof i=="object"&&i!==null?Pl(i):ma,n.state=t.memoizedState,i=e.getDerivedStateFromProps,typeof i=="function"&&(pc(t,e,i,a),n.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof n.getSnapshotBeforeUpdate=="function"||typeof n.UNSAFE_componentWillMount!="function"&&typeof n.componentWillMount!="function"||(i=n.state,typeof n.componentWillMount=="function"&&n.componentWillMount(),typeof n.UNSAFE_componentWillMount=="function"&&n.UNSAFE_componentWillMount(),i!==n.state&&Ec.enqueueReplaceState(n,n.state,null),mu(t,a,n,u),du(),n.state=t.memoizedState),typeof n.componentDidMount=="function"&&(t.flags|=4194308),a=!0}else if(l===null){n=t.stateNode;var c=t.memoizedProps,f=We(e,c);n.props=f;var y=n.context,T=e.contextType;i=ma,typeof T=="object"&&T!==null&&(i=Pl(T));var _=e.getDerivedStateFromProps;T=typeof _=="function"||typeof n.getSnapshotBeforeUpdate=="function",c=t.pendingProps!==c,T||typeof n.UNSAFE_componentWillReceiveProps!="function"&&typeof n.componentWillReceiveProps!="function"||(c||y!==i)&&Do(t,n,a,i),ge=!1;var h=t.memoizedState;n.state=h,mu(t,a,n,u),du(),y=t.memoizedState,c||h!==y||ge?(typeof _=="function"&&(pc(t,e,_,a),y=t.memoizedState),(f=ge||No(t,e,f,a,h,y,i))?(T||typeof n.UNSAFE_componentWillMount!="function"&&typeof n.componentWillMount!="function"||(typeof n.componentWillMount=="function"&&n.componentWillMount(),typeof n.UNSAFE_componentWillMount=="function"&&n.UNSAFE_componentWillMount()),typeof n.componentDidMount=="function"&&(t.flags|=4194308)):(typeof n.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=a,t.memoizedState=y),n.props=a,n.state=y,n.context=i,a=f):(typeof n.componentDidMount=="function"&&(t.flags|=4194308),a=!1)}else{n=t.stateNode,Fi(l,t),i=t.memoizedProps,T=We(e,i),n.props=T,_=t.pendingProps,h=n.context,y=e.contextType,f=ma,typeof y=="object"&&y!==null&&(f=Pl(y)),c=e.getDerivedStateFromProps,(y=typeof c=="function"||typeof n.getSnapshotBeforeUpdate=="function")||typeof n.UNSAFE_componentWillReceiveProps!="function"&&typeof n.componentWillReceiveProps!="function"||(i!==_||h!==f)&&Do(t,n,a,f),ge=!1,h=t.memoizedState,n.state=h,mu(t,a,n,u),du();var S=t.memoizedState;i!==_||h!==S||ge||l!==null&&l.dependencies!==null&&rn(l.dependencies)?(typeof c=="function"&&(pc(t,e,c,a),S=t.memoizedState),(T=ge||No(t,e,T,a,h,S,f)||l!==null&&l.dependencies!==null&&rn(l.dependencies))?(y||typeof n.UNSAFE_componentWillUpdate!="function"&&typeof n.componentWillUpdate!="function"||(typeof n.componentWillUpdate=="function"&&n.componentWillUpdate(a,S,f),typeof n.UNSAFE_componentWillUpdate=="function"&&n.UNSAFE_componentWillUpdate(a,S,f)),typeof n.componentDidUpdate=="function"&&(t.flags|=4),typeof n.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof n.componentDidUpdate!="function"||i===l.memoizedProps&&h===l.memoizedState||(t.flags|=4),typeof n.getSnapshotBeforeUpdate!="function"||i===l.memoizedProps&&h===l.memoizedState||(t.flags|=1024),t.memoizedProps=a,t.memoizedState=S),n.props=a,n.state=S,n.context=f,a=T):(typeof n.componentDidUpdate!="function"||i===l.memoizedProps&&h===l.memoizedState||(t.flags|=4),typeof n.getSnapshotBeforeUpdate!="function"||i===l.memoizedProps&&h===l.memoizedState||(t.flags|=1024),a=!1)}return n=a,Nn(l,t),a=(t.flags&128)!==0,n||a?(n=t.stateNode,e=a&&typeof e.getDerivedStateFromError!="function"?null:n.render(),t.flags|=1,l!==null&&a?(t.child=$e(t,l.child,null,u),t.child=$e(t,null,e,u)):Il(l,t,e,u),t.memoizedState=n.state,l=t.child):l=It(l,t,u),l}function wo(l,t,e,a){return Xe(),t.flags|=256,Il(l,t,e,a),t.child}var xc={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function _c(l){return{baseLanes:l,cachePool:Hs()}}function Oc(l,t,e){return l=l!==null?l.childLanes&~e:0,t&&(l|=zt),l}function Jo(l,t,e){var a=t.pendingProps,u=!1,n=(t.flags&128)!==0,i;if((i=n)||(i=l!==null&&l.memoizedState===null?!1:(Rl.current&2)!==0),i&&(u=!0,t.flags&=-129),i=(t.flags&32)!==0,t.flags&=-33,l===null){if(cl){if(u?pe(t):Ee(),(l=_l)?(l=td(l,Dt),l=l!==null&&l.data!=="&"?l:null,l!==null&&(t.memoizedState={dehydrated:l,treeContext:me!==null?{id:Lt,overflow:Qt}:null,retryLane:536870912,hydrationErrors:null},e=xs(l),e.return=t,t.child=e,Fl=t,_l=null)):l=null,l===null)throw ve(t);return of(l)?t.lanes=32:t.lanes=536870912,null}var c=a.children;return a=a.fallback,u?(Ee(),u=t.mode,c=Dn({mode:"hidden",children:c},u),a=Qe(a,u,e,null),c.return=t,a.return=t,c.sibling=a,t.child=c,a=t.child,a.memoizedState=_c(e),a.childLanes=Oc(l,i,e),t.memoizedState=xc,bu(null,a)):(pe(t),Mc(t,c))}var f=l.memoizedState;if(f!==null&&(c=f.dehydrated,c!==null)){if(n)t.flags&256?(pe(t),t.flags&=-257,t=Uc(l,t,e)):t.memoizedState!==null?(Ee(),t.child=l.child,t.flags|=128,t=null):(Ee(),c=a.fallback,u=t.mode,a=Dn({mode:"visible",children:a.children},u),c=Qe(c,u,e,null),c.flags|=2,a.return=t,c.return=t,a.sibling=c,t.child=a,$e(t,l.child,null,e),a=t.child,a.memoizedState=_c(e),a.childLanes=Oc(l,i,e),t.memoizedState=xc,t=bu(null,a));else if(pe(t),of(c)){if(i=c.nextSibling&&c.nextSibling.dataset,i)var y=i.dgst;i=y,a=Error(r(419)),a.stack="",a.digest=i,iu({value:a,source:null,stack:null}),t=Uc(l,t,e)}else if(Ql||ga(l,t,e,!1),i=(e&l.childLanes)!==0,Ql||i){if(i=El,i!==null&&(a=jf(i,e),a!==0&&a!==f.retryLane))throw f.retryLane=a,Le(l,a),dt(i,l,a),Tc;sf(c)||Ln(),t=Uc(l,t,e)}else sf(c)?(t.flags|=192,t.child=l.child,t=null):(l=f.treeContext,_l=Ct(c.nextSibling),Fl=t,cl=!0,ye=null,Dt=!1,l!==null&&Ms(t,l),t=Mc(t,a.children),t.flags|=4096);return t}return u?(Ee(),c=a.fallback,u=t.mode,f=l.child,y=f.sibling,a=Jt(f,{mode:"hidden",children:a.children}),a.subtreeFlags=f.subtreeFlags&65011712,y!==null?c=Jt(y,c):(c=Qe(c,u,e,null),c.flags|=2),c.return=t,a.return=t,a.sibling=c,t.child=a,bu(null,a),a=t.child,c=l.child.memoizedState,c===null?c=_c(e):(u=c.cachePool,u!==null?(f=Gl._currentValue,u=u.parent!==f?{parent:f,pool:f}:u):u=Hs(),c={baseLanes:c.baseLanes|e,cachePool:u}),a.memoizedState=c,a.childLanes=Oc(l,i,e),t.memoizedState=xc,bu(l.child,a)):(pe(t),e=l.child,l=e.sibling,e=Jt(e,{mode:"visible",children:a.children}),e.return=t,e.sibling=null,l!==null&&(i=t.deletions,i===null?(t.deletions=[l],t.flags|=16):i.push(l)),t.child=e,t.memoizedState=null,e)}function Mc(l,t){return t=Dn({mode:"visible",children:t},l.mode),t.return=l,l.child=t}function Dn(l,t){return l=bt(22,l,null,t),l.lanes=0,l}function Uc(l,t,e){return $e(t,l.child,null,e),l=Mc(t,t.pendingProps.children),l.flags|=2,t.memoizedState=null,l}function $o(l,t,e){l.lanes|=t;var a=l.alternate;a!==null&&(a.lanes|=t),Vi(l.return,t,e)}function Nc(l,t,e,a,u,n){var i=l.memoizedState;i===null?l.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:a,tail:e,tailMode:u,treeForkCount:n}:(i.isBackwards=t,i.rendering=null,i.renderingStartTime=0,i.last=a,i.tail=e,i.tailMode=u,i.treeForkCount=n)}function ko(l,t,e){var a=t.pendingProps,u=a.revealOrder,n=a.tail;a=a.children;var i=Rl.current,c=(i&2)!==0;if(c?(i=i&1|2,t.flags|=128):i&=1,N(Rl,i),Il(l,t,a,e),a=cl?nu:0,!c&&l!==null&&(l.flags&128)!==0)l:for(l=t.child;l!==null;){if(l.tag===13)l.memoizedState!==null&&$o(l,e,t);else if(l.tag===19)$o(l,e,t);else if(l.child!==null){l.child.return=l,l=l.child;continue}if(l===t)break l;for(;l.sibling===null;){if(l.return===null||l.return===t)break l;l=l.return}l.sibling.return=l.return,l=l.sibling}switch(u){case"forwards":for(e=t.child,u=null;e!==null;)l=e.alternate,l!==null&&Sn(l)===null&&(u=e),e=e.sibling;e=u,e===null?(u=t.child,t.child=null):(u=e.sibling,e.sibling=null),Nc(t,!1,u,e,n,a);break;case"backwards":case"unstable_legacy-backwards":for(e=null,u=t.child,t.child=null;u!==null;){if(l=u.alternate,l!==null&&Sn(l)===null){t.child=u;break}l=u.sibling,u.sibling=e,e=u,u=l}Nc(t,!0,e,null,n,a);break;case"together":Nc(t,!1,null,null,void 0,a);break;default:t.memoizedState=null}return t.child}function It(l,t,e){if(l!==null&&(t.dependencies=l.dependencies),Ae|=t.lanes,(e&t.childLanes)===0)if(l!==null){if(ga(l,t,e,!1),(e&t.childLanes)===0)return null}else return null;if(l!==null&&t.child!==l.child)throw Error(r(153));if(t.child!==null){for(l=t.child,e=Jt(l,l.pendingProps),t.child=e,e.return=t;l.sibling!==null;)l=l.sibling,e=e.sibling=Jt(l,l.pendingProps),e.return=t;e.sibling=null}return t.child}function Dc(l,t){return(l.lanes&t)!==0?!0:(l=l.dependencies,!!(l!==null&&rn(l)))}function nm(l,t,e){switch(t.tag){case 3:kl(t,t.stateNode.containerInfo),he(t,Gl,l.memoizedState.cache),Xe();break;case 27:case 5:Rt(t);break;case 4:kl(t,t.stateNode.containerInfo);break;case 10:he(t,t.type,t.memoizedProps.value);break;case 31:if(t.memoizedState!==null)return t.flags|=128,ec(t),null;break;case 13:var a=t.memoizedState;if(a!==null)return a.dehydrated!==null?(pe(t),t.flags|=128,null):(e&t.child.childLanes)!==0?Jo(l,t,e):(pe(t),l=It(l,t,e),l!==null?l.sibling:null);pe(t);break;case 19:var u=(l.flags&128)!==0;if(a=(e&t.childLanes)!==0,a||(ga(l,t,e,!1),a=(e&t.childLanes)!==0),u){if(a)return ko(l,t,e);t.flags|=128}if(u=t.memoizedState,u!==null&&(u.rendering=null,u.tail=null,u.lastEffect=null),N(Rl,Rl.current),a)break;return null;case 22:return t.lanes=0,Qo(l,t,e,t.pendingProps);case 24:he(t,Gl,l.memoizedState.cache)}return It(l,t,e)}function Wo(l,t,e){if(l!==null)if(l.memoizedProps!==t.pendingProps)Ql=!0;else{if(!Dc(l,e)&&(t.flags&128)===0)return Ql=!1,nm(l,t,e);Ql=(l.flags&131072)!==0}else Ql=!1,cl&&(t.flags&1048576)!==0&&Os(t,nu,t.index);switch(t.lanes=0,t.tag){case 16:l:{var a=t.pendingProps;if(l=we(t.elementType),t.type=l,typeof l=="function")Bi(l)?(a=We(l,a),t.tag=1,t=Ko(null,t,l,a,e)):(t.tag=0,t=Ac(null,t,l,a,e));else{if(l!=null){var u=l.$$typeof;if(u===jl){t.tag=11,t=Yo(null,t,l,a,e);break l}else if(u===G){t.tag=14,t=Go(null,t,l,a,e);break l}}throw t=Yl(l)||l,Error(r(306,t,""))}}return t;case 0:return Ac(l,t,t.type,t.pendingProps,e);case 1:return a=t.type,u=We(a,t.pendingProps),Ko(l,t,a,u,e);case 3:l:{if(kl(t,t.stateNode.containerInfo),l===null)throw Error(r(387));a=t.pendingProps;var n=t.memoizedState;u=n.element,Fi(l,t),mu(t,a,null,e);var i=t.memoizedState;if(a=i.cache,he(t,Gl,a),a!==n.cache&&Ki(t,[Gl],e,!0),du(),a=i.element,n.isDehydrated)if(n={element:a,isDehydrated:!1,cache:i.cache},t.updateQueue.baseState=n,t.memoizedState=n,t.flags&256){t=wo(l,t,a,e);break l}else if(a!==u){u=Mt(Error(r(424)),t),iu(u),t=wo(l,t,a,e);break l}else{switch(l=t.stateNode.containerInfo,l.nodeType){case 9:l=l.body;break;default:l=l.nodeName==="HTML"?l.ownerDocument.body:l}for(_l=Ct(l.firstChild),Fl=t,cl=!0,ye=null,Dt=!0,e=Ls(t,null,a,e),t.child=e;e;)e.flags=e.flags&-3|4096,e=e.sibling}else{if(Xe(),a===u){t=It(l,t,e);break l}Il(l,t,a,e)}t=t.child}return t;case 26:return Nn(l,t),l===null?(e=cd(t.type,null,t.pendingProps,null))?t.memoizedState=e:cl||(e=t.type,l=t.pendingProps,a=Jn(J.current).createElement(e),a[Wl]=t,a[it]=l,lt(a,e,l),Jl(a),t.stateNode=a):t.memoizedState=cd(t.type,l.memoizedProps,t.pendingProps,l.memoizedState),null;case 27:return Rt(t),l===null&&cl&&(a=t.stateNode=ud(t.type,t.pendingProps,J.current),Fl=t,Dt=!0,u=_l,Ue(t.type)?(rf=u,_l=Ct(a.firstChild)):_l=u),Il(l,t,t.pendingProps.children,e),Nn(l,t),l===null&&(t.flags|=4194304),t.child;case 5:return l===null&&cl&&((u=a=_l)&&(a=Rm(a,t.type,t.pendingProps,Dt),a!==null?(t.stateNode=a,Fl=t,_l=Ct(a.firstChild),Dt=!1,u=!0):u=!1),u||ve(t)),Rt(t),u=t.type,n=t.pendingProps,i=l!==null?l.memoizedProps:null,a=n.children,nf(u,n)?a=null:i!==null&&nf(u,i)&&(t.flags|=32),t.memoizedState!==null&&(u=uc(l,t,W0,null,null,e),Cu._currentValue=u),Nn(l,t),Il(l,t,a,e),t.child;case 6:return l===null&&cl&&((l=e=_l)&&(e=Bm(e,t.pendingProps,Dt),e!==null?(t.stateNode=e,Fl=t,_l=null,l=!0):l=!1),l||ve(t)),null;case 13:return Jo(l,t,e);case 4:return kl(t,t.stateNode.containerInfo),a=t.pendingProps,l===null?t.child=$e(t,null,a,e):Il(l,t,a,e),t.child;case 11:return Yo(l,t,t.type,t.pendingProps,e);case 7:return Il(l,t,t.pendingProps,e),t.child;case 8:return Il(l,t,t.pendingProps.children,e),t.child;case 12:return Il(l,t,t.pendingProps.children,e),t.child;case 10:return a=t.pendingProps,he(t,t.type,a.value),Il(l,t,a.children,e),t.child;case 9:return u=t.type._context,a=t.pendingProps.children,Ve(t),u=Pl(u),a=a(u),t.flags|=1,Il(l,t,a,e),t.child;case 14:return Go(l,t,t.type,t.pendingProps,e);case 15:return Lo(l,t,t.type,t.pendingProps,e);case 19:return ko(l,t,e);case 31:return um(l,t,e);case 22:return Qo(l,t,e,t.pendingProps);case 24:return Ve(t),a=Pl(Gl),l===null?(u=$i(),u===null&&(u=El,n=wi(),u.pooledCache=n,n.refCount++,n!==null&&(u.pooledCacheLanes|=e),u=n),t.memoizedState={parent:a,cache:u},Wi(t),he(t,Gl,u)):((l.lanes&e)!==0&&(Fi(l,t),mu(t,null,null,e),du()),u=l.memoizedState,n=t.memoizedState,u.parent!==a?(u={parent:a,cache:a},t.memoizedState=u,t.lanes===0&&(t.memoizedState=t.updateQueue.baseState=u),he(t,Gl,a)):(a=n.cache,he(t,Gl,a),a!==u.cache&&Ki(t,[Gl],e,!0))),Il(l,t,t.pendingProps.children,e),t.child;case 29:throw t.pendingProps}throw Error(r(156,t.tag))}function le(l){l.flags|=4}function jc(l,t,e,a,u){if((t=(l.mode&32)!==0)&&(t=!1),t){if(l.flags|=16777216,(u&335544128)===u)if(l.stateNode.complete)l.flags|=8192;else if(Tr())l.flags|=8192;else throw Je=vn,ki}else l.flags&=-16777217}function Fo(l,t){if(t.type!=="stylesheet"||(t.state.loading&4)!==0)l.flags&=-16777217;else if(l.flags|=16777216,!dd(t))if(Tr())l.flags|=8192;else throw Je=vn,ki}function jn(l,t){t!==null&&(l.flags|=4),l.flags&16384&&(t=l.tag!==22?Uf():536870912,l.lanes|=t,Ua|=t)}function Su(l,t){if(!cl)switch(l.tailMode){case"hidden":t=l.tail;for(var e=null;t!==null;)t.alternate!==null&&(e=t),t=t.sibling;e===null?l.tail=null:e.sibling=null;break;case"collapsed":e=l.tail;for(var a=null;e!==null;)e.alternate!==null&&(a=e),e=e.sibling;a===null?t||l.tail===null?l.tail=null:l.tail.sibling=null:a.sibling=null}}function Ol(l){var t=l.alternate!==null&&l.alternate.child===l.child,e=0,a=0;if(t)for(var u=l.child;u!==null;)e|=u.lanes|u.childLanes,a|=u.subtreeFlags&65011712,a|=u.flags&65011712,u.return=l,u=u.sibling;else for(u=l.child;u!==null;)e|=u.lanes|u.childLanes,a|=u.subtreeFlags,a|=u.flags,u.return=l,u=u.sibling;return l.subtreeFlags|=a,l.childLanes=e,t}function im(l,t,e){var a=t.pendingProps;switch(Li(t),t.tag){case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Ol(t),null;case 1:return Ol(t),null;case 3:return e=t.stateNode,a=null,l!==null&&(a=l.memoizedState.cache),t.memoizedState.cache!==a&&(t.flags|=2048),Wt(Gl),Dl(),e.pendingContext&&(e.context=e.pendingContext,e.pendingContext=null),(l===null||l.child===null)&&(ha(t)?le(t):l===null||l.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,Xi())),Ol(t),null;case 26:var u=t.type,n=t.memoizedState;return l===null?(le(t),n!==null?(Ol(t),Fo(t,n)):(Ol(t),jc(t,u,null,a,e))):n?n!==l.memoizedState?(le(t),Ol(t),Fo(t,n)):(Ol(t),t.flags&=-16777217):(l=l.memoizedProps,l!==a&&le(t),Ol(t),jc(t,u,l,a,e)),null;case 27:if(At(t),e=J.current,u=t.type,l!==null&&t.stateNode!=null)l.memoizedProps!==a&&le(t);else{if(!a){if(t.stateNode===null)throw Error(r(166));return Ol(t),null}l=H.current,ha(t)?Us(t):(l=ud(u,a,e),t.stateNode=l,le(t))}return Ol(t),null;case 5:if(At(t),u=t.type,l!==null&&t.stateNode!=null)l.memoizedProps!==a&&le(t);else{if(!a){if(t.stateNode===null)throw Error(r(166));return Ol(t),null}if(n=H.current,ha(t))Us(t);else{var i=Jn(J.current);switch(n){case 1:n=i.createElementNS("http://www.w3.org/2000/svg",u);break;case 2:n=i.createElementNS("http://www.w3.org/1998/Math/MathML",u);break;default:switch(u){case"svg":n=i.createElementNS("http://www.w3.org/2000/svg",u);break;case"math":n=i.createElementNS("http://www.w3.org/1998/Math/MathML",u);break;case"script":n=i.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild);break;case"select":n=typeof a.is=="string"?i.createElement("select",{is:a.is}):i.createElement("select"),a.multiple?n.multiple=!0:a.size&&(n.size=a.size);break;default:n=typeof a.is=="string"?i.createElement(u,{is:a.is}):i.createElement(u)}}n[Wl]=t,n[it]=a;l:for(i=t.child;i!==null;){if(i.tag===5||i.tag===6)n.appendChild(i.stateNode);else if(i.tag!==4&&i.tag!==27&&i.child!==null){i.child.return=i,i=i.child;continue}if(i===t)break l;for(;i.sibling===null;){if(i.return===null||i.return===t)break l;i=i.return}i.sibling.return=i.return,i=i.sibling}t.stateNode=n;l:switch(lt(n,u,a),u){case"button":case"input":case"select":case"textarea":a=!!a.autoFocus;break l;case"img":a=!0;break l;default:a=!1}a&&le(t)}}return Ol(t),jc(t,t.type,l===null?null:l.memoizedProps,t.pendingProps,e),null;case 6:if(l&&t.stateNode!=null)l.memoizedProps!==a&&le(t);else{if(typeof a!="string"&&t.stateNode===null)throw Error(r(166));if(l=J.current,ha(t)){if(l=t.stateNode,e=t.memoizedProps,a=null,u=Fl,u!==null)switch(u.tag){case 27:case 5:a=u.memoizedProps}l[Wl]=t,l=!!(l.nodeValue===e||a!==null&&a.suppressHydrationWarning===!0||Jr(l.nodeValue,e)),l||ve(t,!0)}else l=Jn(l).createTextNode(a),l[Wl]=t,t.stateNode=l}return Ol(t),null;case 31:if(e=t.memoizedState,l===null||l.memoizedState!==null){if(a=ha(t),e!==null){if(l===null){if(!a)throw Error(r(318));if(l=t.memoizedState,l=l!==null?l.dehydrated:null,!l)throw Error(r(557));l[Wl]=t}else Xe(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;Ol(t),l=!1}else e=Xi(),l!==null&&l.memoizedState!==null&&(l.memoizedState.hydrationErrors=e),l=!0;if(!l)return t.flags&256?(pt(t),t):(pt(t),null);if((t.flags&128)!==0)throw Error(r(558))}return Ol(t),null;case 13:if(a=t.memoizedState,l===null||l.memoizedState!==null&&l.memoizedState.dehydrated!==null){if(u=ha(t),a!==null&&a.dehydrated!==null){if(l===null){if(!u)throw Error(r(318));if(u=t.memoizedState,u=u!==null?u.dehydrated:null,!u)throw Error(r(317));u[Wl]=t}else Xe(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;Ol(t),u=!1}else u=Xi(),l!==null&&l.memoizedState!==null&&(l.memoizedState.hydrationErrors=u),u=!0;if(!u)return t.flags&256?(pt(t),t):(pt(t),null)}return pt(t),(t.flags&128)!==0?(t.lanes=e,t):(e=a!==null,l=l!==null&&l.memoizedState!==null,e&&(a=t.child,u=null,a.alternate!==null&&a.alternate.memoizedState!==null&&a.alternate.memoizedState.cachePool!==null&&(u=a.alternate.memoizedState.cachePool.pool),n=null,a.memoizedState!==null&&a.memoizedState.cachePool!==null&&(n=a.memoizedState.cachePool.pool),n!==u&&(a.flags|=2048)),e!==l&&e&&(t.child.flags|=8192),jn(t,t.updateQueue),Ol(t),null);case 4:return Dl(),l===null&&lf(t.stateNode.containerInfo),Ol(t),null;case 10:return Wt(t.type),Ol(t),null;case 19:if(E(Rl),a=t.memoizedState,a===null)return Ol(t),null;if(u=(t.flags&128)!==0,n=a.rendering,n===null)if(u)Su(a,!1);else{if(Hl!==0||l!==null&&(l.flags&128)!==0)for(l=t.child;l!==null;){if(n=Sn(l),n!==null){for(t.flags|=128,Su(a,!1),l=n.updateQueue,t.updateQueue=l,jn(t,l),t.subtreeFlags=0,l=e,e=t.child;e!==null;)As(e,l),e=e.sibling;return N(Rl,Rl.current&1|2),cl&&$t(t,a.treeForkCount),t.child}l=l.sibling}a.tail!==null&&al()>qn&&(t.flags|=128,u=!0,Su(a,!1),t.lanes=4194304)}else{if(!u)if(l=Sn(n),l!==null){if(t.flags|=128,u=!0,l=l.updateQueue,t.updateQueue=l,jn(t,l),Su(a,!0),a.tail===null&&a.tailMode==="hidden"&&!n.alternate&&!cl)return Ol(t),null}else 2*al()-a.renderingStartTime>qn&&e!==536870912&&(t.flags|=128,u=!0,Su(a,!1),t.lanes=4194304);a.isBackwards?(n.sibling=t.child,t.child=n):(l=a.last,l!==null?l.sibling=n:t.child=n,a.last=n)}return a.tail!==null?(l=a.tail,a.rendering=l,a.tail=l.sibling,a.renderingStartTime=al(),l.sibling=null,e=Rl.current,N(Rl,u?e&1|2:e&1),cl&&$t(t,a.treeForkCount),l):(Ol(t),null);case 22:case 23:return pt(t),tc(),a=t.memoizedState!==null,l!==null?l.memoizedState!==null!==a&&(t.flags|=8192):a&&(t.flags|=8192),a?(e&536870912)!==0&&(t.flags&128)===0&&(Ol(t),t.subtreeFlags&6&&(t.flags|=8192)):Ol(t),e=t.updateQueue,e!==null&&jn(t,e.retryQueue),e=null,l!==null&&l.memoizedState!==null&&l.memoizedState.cachePool!==null&&(e=l.memoizedState.cachePool.pool),a=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(a=t.memoizedState.cachePool.pool),a!==e&&(t.flags|=2048),l!==null&&E(Ke),null;case 24:return e=null,l!==null&&(e=l.memoizedState.cache),t.memoizedState.cache!==e&&(t.flags|=2048),Wt(Gl),Ol(t),null;case 25:return null;case 30:return null}throw Error(r(156,t.tag))}function cm(l,t){switch(Li(t),t.tag){case 1:return l=t.flags,l&65536?(t.flags=l&-65537|128,t):null;case 3:return Wt(Gl),Dl(),l=t.flags,(l&65536)!==0&&(l&128)===0?(t.flags=l&-65537|128,t):null;case 26:case 27:case 5:return At(t),null;case 31:if(t.memoizedState!==null){if(pt(t),t.alternate===null)throw Error(r(340));Xe()}return l=t.flags,l&65536?(t.flags=l&-65537|128,t):null;case 13:if(pt(t),l=t.memoizedState,l!==null&&l.dehydrated!==null){if(t.alternate===null)throw Error(r(340));Xe()}return l=t.flags,l&65536?(t.flags=l&-65537|128,t):null;case 19:return E(Rl),null;case 4:return Dl(),null;case 10:return Wt(t.type),null;case 22:case 23:return pt(t),tc(),l!==null&&E(Ke),l=t.flags,l&65536?(t.flags=l&-65537|128,t):null;case 24:return Wt(Gl),null;case 25:return null;default:return null}}function Po(l,t){switch(Li(t),t.tag){case 3:Wt(Gl),Dl();break;case 26:case 27:case 5:At(t);break;case 4:Dl();break;case 31:t.memoizedState!==null&&pt(t);break;case 13:pt(t);break;case 19:E(Rl);break;case 10:Wt(t.type);break;case 22:case 23:pt(t),tc(),l!==null&&E(Ke);break;case 24:Wt(Gl)}}function pu(l,t){try{var e=t.updateQueue,a=e!==null?e.lastEffect:null;if(a!==null){var u=a.next;e=u;do{if((e.tag&l)===l){a=void 0;var n=e.create,i=e.inst;a=n(),i.destroy=a}e=e.next}while(e!==u)}}catch(c){ml(t,t.return,c)}}function ze(l,t,e){try{var a=t.updateQueue,u=a!==null?a.lastEffect:null;if(u!==null){var n=u.next;a=n;do{if((a.tag&l)===l){var i=a.inst,c=i.destroy;if(c!==void 0){i.destroy=void 0,u=t;var f=e,y=c;try{y()}catch(T){ml(u,f,T)}}}a=a.next}while(a!==n)}}catch(T){ml(t,t.return,T)}}function Io(l){var t=l.updateQueue;if(t!==null){var e=l.stateNode;try{Xs(t,e)}catch(a){ml(l,l.return,a)}}}function lr(l,t,e){e.props=We(l.type,l.memoizedProps),e.state=l.memoizedState;try{e.componentWillUnmount()}catch(a){ml(l,t,a)}}function Eu(l,t){try{var e=l.ref;if(e!==null){switch(l.tag){case 26:case 27:case 5:var a=l.stateNode;break;case 30:a=l.stateNode;break;default:a=l.stateNode}typeof e=="function"?l.refCleanup=e(a):e.current=a}}catch(u){ml(l,t,u)}}function Xt(l,t){var e=l.ref,a=l.refCleanup;if(e!==null)if(typeof a=="function")try{a()}catch(u){ml(l,t,u)}finally{l.refCleanup=null,l=l.alternate,l!=null&&(l.refCleanup=null)}else if(typeof e=="function")try{e(null)}catch(u){ml(l,t,u)}else e.current=null}function tr(l){var t=l.type,e=l.memoizedProps,a=l.stateNode;try{l:switch(t){case"button":case"input":case"select":case"textarea":e.autoFocus&&a.focus();break l;case"img":e.src?a.src=e.src:e.srcSet&&(a.srcset=e.srcSet)}}catch(u){ml(l,l.return,u)}}function Cc(l,t,e){try{var a=l.stateNode;Um(a,l.type,e,t),a[it]=t}catch(u){ml(l,l.return,u)}}function er(l){return l.tag===5||l.tag===3||l.tag===26||l.tag===27&&Ue(l.type)||l.tag===4}function Hc(l){l:for(;;){for(;l.sibling===null;){if(l.return===null||er(l.return))return null;l=l.return}for(l.sibling.return=l.return,l=l.sibling;l.tag!==5&&l.tag!==6&&l.tag!==18;){if(l.tag===27&&Ue(l.type)||l.flags&2||l.child===null||l.tag===4)continue l;l.child.return=l,l=l.child}if(!(l.flags&2))return l.stateNode}}function Rc(l,t,e){var a=l.tag;if(a===5||a===6)l=l.stateNode,t?(e.nodeType===9?e.body:e.nodeName==="HTML"?e.ownerDocument.body:e).insertBefore(l,t):(t=e.nodeType===9?e.body:e.nodeName==="HTML"?e.ownerDocument.body:e,t.appendChild(l),e=e._reactRootContainer,e!=null||t.onclick!==null||(t.onclick=Kt));else if(a!==4&&(a===27&&Ue(l.type)&&(e=l.stateNode,t=null),l=l.child,l!==null))for(Rc(l,t,e),l=l.sibling;l!==null;)Rc(l,t,e),l=l.sibling}function Cn(l,t,e){var a=l.tag;if(a===5||a===6)l=l.stateNode,t?e.insertBefore(l,t):e.appendChild(l);else if(a!==4&&(a===27&&Ue(l.type)&&(e=l.stateNode),l=l.child,l!==null))for(Cn(l,t,e),l=l.sibling;l!==null;)Cn(l,t,e),l=l.sibling}function ar(l){var t=l.stateNode,e=l.memoizedProps;try{for(var a=l.type,u=t.attributes;u.length;)t.removeAttributeNode(u[0]);lt(t,a,e),t[Wl]=l,t[it]=e}catch(n){ml(l,l.return,n)}}var te=!1,Xl=!1,Bc=!1,ur=typeof WeakSet=="function"?WeakSet:Set,$l=null;function fm(l,t){if(l=l.containerInfo,af=li,l=vs(l),Ui(l)){if("selectionStart"in l)var e={start:l.selectionStart,end:l.selectionEnd};else l:{e=(e=l.ownerDocument)&&e.defaultView||window;var a=e.getSelection&&e.getSelection();if(a&&a.rangeCount!==0){e=a.anchorNode;var u=a.anchorOffset,n=a.focusNode;a=a.focusOffset;try{e.nodeType,n.nodeType}catch{e=null;break l}var i=0,c=-1,f=-1,y=0,T=0,_=l,h=null;t:for(;;){for(var S;_!==e||u!==0&&_.nodeType!==3||(c=i+u),_!==n||a!==0&&_.nodeType!==3||(f=i+a),_.nodeType===3&&(i+=_.nodeValue.length),(S=_.firstChild)!==null;)h=_,_=S;for(;;){if(_===l)break t;if(h===e&&++y===u&&(c=i),h===n&&++T===a&&(f=i),(S=_.nextSibling)!==null)break;_=h,h=_.parentNode}_=S}e=c===-1||f===-1?null:{start:c,end:f}}else e=null}e=e||{start:0,end:0}}else e=null;for(uf={focusedElem:l,selectionRange:e},li=!1,$l=t;$l!==null;)if(t=$l,l=t.child,(t.subtreeFlags&1028)!==0&&l!==null)l.return=t,$l=l;else for(;$l!==null;){switch(t=$l,n=t.alternate,l=t.flags,t.tag){case 0:if((l&4)!==0&&(l=t.updateQueue,l=l!==null?l.events:null,l!==null))for(e=0;e<l.length;e++)u=l[e],u.ref.impl=u.nextImpl;break;case 11:case 15:break;case 1:if((l&1024)!==0&&n!==null){l=void 0,e=t,u=n.memoizedProps,n=n.memoizedState,a=e.stateNode;try{var q=We(e.type,u);l=a.getSnapshotBeforeUpdate(q,n),a.__reactInternalSnapshotBeforeUpdate=l}catch(V){ml(e,e.return,V)}}break;case 3:if((l&1024)!==0){if(l=t.stateNode.containerInfo,e=l.nodeType,e===9)ff(l);else if(e===1)switch(l.nodeName){case"HEAD":case"HTML":case"BODY":ff(l);break;default:l.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((l&1024)!==0)throw Error(r(163))}if(l=t.sibling,l!==null){l.return=t.return,$l=l;break}$l=t.return}}function nr(l,t,e){var a=e.flags;switch(e.tag){case 0:case 11:case 15:ae(l,e),a&4&&pu(5,e);break;case 1:if(ae(l,e),a&4)if(l=e.stateNode,t===null)try{l.componentDidMount()}catch(i){ml(e,e.return,i)}else{var u=We(e.type,t.memoizedProps);t=t.memoizedState;try{l.componentDidUpdate(u,t,l.__reactInternalSnapshotBeforeUpdate)}catch(i){ml(e,e.return,i)}}a&64&&Io(e),a&512&&Eu(e,e.return);break;case 3:if(ae(l,e),a&64&&(l=e.updateQueue,l!==null)){if(t=null,e.child!==null)switch(e.child.tag){case 27:case 5:t=e.child.stateNode;break;case 1:t=e.child.stateNode}try{Xs(l,t)}catch(i){ml(e,e.return,i)}}break;case 27:t===null&&a&4&&ar(e);case 26:case 5:ae(l,e),t===null&&a&4&&tr(e),a&512&&Eu(e,e.return);break;case 12:ae(l,e);break;case 31:ae(l,e),a&4&&fr(l,e);break;case 13:ae(l,e),a&4&&sr(l,e),a&64&&(l=e.memoizedState,l!==null&&(l=l.dehydrated,l!==null&&(e=gm.bind(null,e),qm(l,e))));break;case 22:if(a=e.memoizedState!==null||te,!a){t=t!==null&&t.memoizedState!==null||Xl,u=te;var n=Xl;te=a,(Xl=t)&&!n?ue(l,e,(e.subtreeFlags&8772)!==0):ae(l,e),te=u,Xl=n}break;case 30:break;default:ae(l,e)}}function ir(l){var t=l.alternate;t!==null&&(l.alternate=null,ir(t)),l.child=null,l.deletions=null,l.sibling=null,l.tag===5&&(t=l.stateNode,t!==null&&di(t)),l.stateNode=null,l.return=null,l.dependencies=null,l.memoizedProps=null,l.memoizedState=null,l.pendingProps=null,l.stateNode=null,l.updateQueue=null}var Nl=null,ft=!1;function ee(l,t,e){for(e=e.child;e!==null;)cr(l,t,e),e=e.sibling}function cr(l,t,e){if(vt&&typeof vt.onCommitFiberUnmount=="function")try{vt.onCommitFiberUnmount(Ka,e)}catch{}switch(e.tag){case 26:Xl||Xt(e,t),ee(l,t,e),e.memoizedState?e.memoizedState.count--:e.stateNode&&(e=e.stateNode,e.parentNode.removeChild(e));break;case 27:Xl||Xt(e,t);var a=Nl,u=ft;Ue(e.type)&&(Nl=e.stateNode,ft=!1),ee(l,t,e),Nu(e.stateNode),Nl=a,ft=u;break;case 5:Xl||Xt(e,t);case 6:if(a=Nl,u=ft,Nl=null,ee(l,t,e),Nl=a,ft=u,Nl!==null)if(ft)try{(Nl.nodeType===9?Nl.body:Nl.nodeName==="HTML"?Nl.ownerDocument.body:Nl).removeChild(e.stateNode)}catch(n){ml(e,t,n)}else try{Nl.removeChild(e.stateNode)}catch(n){ml(e,t,n)}break;case 18:Nl!==null&&(ft?(l=Nl,Ir(l.nodeType===9?l.body:l.nodeName==="HTML"?l.ownerDocument.body:l,e.stateNode),qa(l)):Ir(Nl,e.stateNode));break;case 4:a=Nl,u=ft,Nl=e.stateNode.containerInfo,ft=!0,ee(l,t,e),Nl=a,ft=u;break;case 0:case 11:case 14:case 15:ze(2,e,t),Xl||ze(4,e,t),ee(l,t,e);break;case 1:Xl||(Xt(e,t),a=e.stateNode,typeof a.componentWillUnmount=="function"&&lr(e,t,a)),ee(l,t,e);break;case 21:ee(l,t,e);break;case 22:Xl=(a=Xl)||e.memoizedState!==null,ee(l,t,e),Xl=a;break;default:ee(l,t,e)}}function fr(l,t){if(t.memoizedState===null&&(l=t.alternate,l!==null&&(l=l.memoizedState,l!==null))){l=l.dehydrated;try{qa(l)}catch(e){ml(t,t.return,e)}}}function sr(l,t){if(t.memoizedState===null&&(l=t.alternate,l!==null&&(l=l.memoizedState,l!==null&&(l=l.dehydrated,l!==null))))try{qa(l)}catch(e){ml(t,t.return,e)}}function sm(l){switch(l.tag){case 31:case 13:case 19:var t=l.stateNode;return t===null&&(t=l.stateNode=new ur),t;case 22:return l=l.stateNode,t=l._retryCache,t===null&&(t=l._retryCache=new ur),t;default:throw Error(r(435,l.tag))}}function Hn(l,t){var e=sm(l);t.forEach(function(a){if(!e.has(a)){e.add(a);var u=bm.bind(null,l,a);a.then(u,u)}})}function st(l,t){var e=t.deletions;if(e!==null)for(var a=0;a<e.length;a++){var u=e[a],n=l,i=t,c=i;l:for(;c!==null;){switch(c.tag){case 27:if(Ue(c.type)){Nl=c.stateNode,ft=!1;break l}break;case 5:Nl=c.stateNode,ft=!1;break l;case 3:case 4:Nl=c.stateNode.containerInfo,ft=!0;break l}c=c.return}if(Nl===null)throw Error(r(160));cr(n,i,u),Nl=null,ft=!1,n=u.alternate,n!==null&&(n.return=null),u.return=null}if(t.subtreeFlags&13886)for(t=t.child;t!==null;)or(t,l),t=t.sibling}var qt=null;function or(l,t){var e=l.alternate,a=l.flags;switch(l.tag){case 0:case 11:case 14:case 15:st(t,l),ot(l),a&4&&(ze(3,l,l.return),pu(3,l),ze(5,l,l.return));break;case 1:st(t,l),ot(l),a&512&&(Xl||e===null||Xt(e,e.return)),a&64&&te&&(l=l.updateQueue,l!==null&&(a=l.callbacks,a!==null&&(e=l.shared.hiddenCallbacks,l.shared.hiddenCallbacks=e===null?a:e.concat(a))));break;case 26:var u=qt;if(st(t,l),ot(l),a&512&&(Xl||e===null||Xt(e,e.return)),a&4){var n=e!==null?e.memoizedState:null;if(a=l.memoizedState,e===null)if(a===null)if(l.stateNode===null){l:{a=l.type,e=l.memoizedProps,u=u.ownerDocument||u;t:switch(a){case"title":n=u.getElementsByTagName("title")[0],(!n||n[$a]||n[Wl]||n.namespaceURI==="http://www.w3.org/2000/svg"||n.hasAttribute("itemprop"))&&(n=u.createElement(a),u.head.insertBefore(n,u.querySelector("head > title"))),lt(n,a,e),n[Wl]=l,Jl(n),a=n;break l;case"link":var i=od("link","href",u).get(a+(e.href||""));if(i){for(var c=0;c<i.length;c++)if(n=i[c],n.getAttribute("href")===(e.href==null||e.href===""?null:e.href)&&n.getAttribute("rel")===(e.rel==null?null:e.rel)&&n.getAttribute("title")===(e.title==null?null:e.title)&&n.getAttribute("crossorigin")===(e.crossOrigin==null?null:e.crossOrigin)){i.splice(c,1);break t}}n=u.createElement(a),lt(n,a,e),u.head.appendChild(n);break;case"meta":if(i=od("meta","content",u).get(a+(e.content||""))){for(c=0;c<i.length;c++)if(n=i[c],n.getAttribute("content")===(e.content==null?null:""+e.content)&&n.getAttribute("name")===(e.name==null?null:e.name)&&n.getAttribute("property")===(e.property==null?null:e.property)&&n.getAttribute("http-equiv")===(e.httpEquiv==null?null:e.httpEquiv)&&n.getAttribute("charset")===(e.charSet==null?null:e.charSet)){i.splice(c,1);break t}}n=u.createElement(a),lt(n,a,e),u.head.appendChild(n);break;default:throw Error(r(468,a))}n[Wl]=l,Jl(n),a=n}l.stateNode=a}else rd(u,l.type,l.stateNode);else l.stateNode=sd(u,a,l.memoizedProps);else n!==a?(n===null?e.stateNode!==null&&(e=e.stateNode,e.parentNode.removeChild(e)):n.count--,a===null?rd(u,l.type,l.stateNode):sd(u,a,l.memoizedProps)):a===null&&l.stateNode!==null&&Cc(l,l.memoizedProps,e.memoizedProps)}break;case 27:st(t,l),ot(l),a&512&&(Xl||e===null||Xt(e,e.return)),e!==null&&a&4&&Cc(l,l.memoizedProps,e.memoizedProps);break;case 5:if(st(t,l),ot(l),a&512&&(Xl||e===null||Xt(e,e.return)),l.flags&32){u=l.stateNode;try{ia(u,"")}catch(q){ml(l,l.return,q)}}a&4&&l.stateNode!=null&&(u=l.memoizedProps,Cc(l,u,e!==null?e.memoizedProps:u)),a&1024&&(Bc=!0);break;case 6:if(st(t,l),ot(l),a&4){if(l.stateNode===null)throw Error(r(162));a=l.memoizedProps,e=l.stateNode;try{e.nodeValue=a}catch(q){ml(l,l.return,q)}}break;case 3:if(Wn=null,u=qt,qt=$n(t.containerInfo),st(t,l),qt=u,ot(l),a&4&&e!==null&&e.memoizedState.isDehydrated)try{qa(t.containerInfo)}catch(q){ml(l,l.return,q)}Bc&&(Bc=!1,rr(l));break;case 4:a=qt,qt=$n(l.stateNode.containerInfo),st(t,l),ot(l),qt=a;break;case 12:st(t,l),ot(l);break;case 31:st(t,l),ot(l),a&4&&(a=l.updateQueue,a!==null&&(l.updateQueue=null,Hn(l,a)));break;case 13:st(t,l),ot(l),l.child.flags&8192&&l.memoizedState!==null!=(e!==null&&e.memoizedState!==null)&&(Bn=al()),a&4&&(a=l.updateQueue,a!==null&&(l.updateQueue=null,Hn(l,a)));break;case 22:u=l.memoizedState!==null;var f=e!==null&&e.memoizedState!==null,y=te,T=Xl;if(te=y||u,Xl=T||f,st(t,l),Xl=T,te=y,ot(l),a&8192)l:for(t=l.stateNode,t._visibility=u?t._visibility&-2:t._visibility|1,u&&(e===null||f||te||Xl||Fe(l)),e=null,t=l;;){if(t.tag===5||t.tag===26){if(e===null){f=e=t;try{if(n=f.stateNode,u)i=n.style,typeof i.setProperty=="function"?i.setProperty("display","none","important"):i.display="none";else{c=f.stateNode;var _=f.memoizedProps.style,h=_!=null&&_.hasOwnProperty("display")?_.display:null;c.style.display=h==null||typeof h=="boolean"?"":(""+h).trim()}}catch(q){ml(f,f.return,q)}}}else if(t.tag===6){if(e===null){f=t;try{f.stateNode.nodeValue=u?"":f.memoizedProps}catch(q){ml(f,f.return,q)}}}else if(t.tag===18){if(e===null){f=t;try{var S=f.stateNode;u?ld(S,!0):ld(f.stateNode,!1)}catch(q){ml(f,f.return,q)}}}else if((t.tag!==22&&t.tag!==23||t.memoizedState===null||t===l)&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===l)break l;for(;t.sibling===null;){if(t.return===null||t.return===l)break l;e===t&&(e=null),t=t.return}e===t&&(e=null),t.sibling.return=t.return,t=t.sibling}a&4&&(a=l.updateQueue,a!==null&&(e=a.retryQueue,e!==null&&(a.retryQueue=null,Hn(l,e))));break;case 19:st(t,l),ot(l),a&4&&(a=l.updateQueue,a!==null&&(l.updateQueue=null,Hn(l,a)));break;case 30:break;case 21:break;default:st(t,l),ot(l)}}function ot(l){var t=l.flags;if(t&2){try{for(var e,a=l.return;a!==null;){if(er(a)){e=a;break}a=a.return}if(e==null)throw Error(r(160));switch(e.tag){case 27:var u=e.stateNode,n=Hc(l);Cn(l,n,u);break;case 5:var i=e.stateNode;e.flags&32&&(ia(i,""),e.flags&=-33);var c=Hc(l);Cn(l,c,i);break;case 3:case 4:var f=e.stateNode.containerInfo,y=Hc(l);Rc(l,y,f);break;default:throw Error(r(161))}}catch(T){ml(l,l.return,T)}l.flags&=-3}t&4096&&(l.flags&=-4097)}function rr(l){if(l.subtreeFlags&1024)for(l=l.child;l!==null;){var t=l;rr(t),t.tag===5&&t.flags&1024&&t.stateNode.reset(),l=l.sibling}}function ae(l,t){if(t.subtreeFlags&8772)for(t=t.child;t!==null;)nr(l,t.alternate,t),t=t.sibling}function Fe(l){for(l=l.child;l!==null;){var t=l;switch(t.tag){case 0:case 11:case 14:case 15:ze(4,t,t.return),Fe(t);break;case 1:Xt(t,t.return);var e=t.stateNode;typeof e.componentWillUnmount=="function"&&lr(t,t.return,e),Fe(t);break;case 27:Nu(t.stateNode);case 26:case 5:Xt(t,t.return),Fe(t);break;case 22:t.memoizedState===null&&Fe(t);break;case 30:Fe(t);break;default:Fe(t)}l=l.sibling}}function ue(l,t,e){for(e=e&&(t.subtreeFlags&8772)!==0,t=t.child;t!==null;){var a=t.alternate,u=l,n=t,i=n.flags;switch(n.tag){case 0:case 11:case 15:ue(u,n,e),pu(4,n);break;case 1:if(ue(u,n,e),a=n,u=a.stateNode,typeof u.componentDidMount=="function")try{u.componentDidMount()}catch(y){ml(a,a.return,y)}if(a=n,u=a.updateQueue,u!==null){var c=a.stateNode;try{var f=u.shared.hiddenCallbacks;if(f!==null)for(u.shared.hiddenCallbacks=null,u=0;u<f.length;u++)Qs(f[u],c)}catch(y){ml(a,a.return,y)}}e&&i&64&&Io(n),Eu(n,n.return);break;case 27:ar(n);case 26:case 5:ue(u,n,e),e&&a===null&&i&4&&tr(n),Eu(n,n.return);break;case 12:ue(u,n,e);break;case 31:ue(u,n,e),e&&i&4&&fr(u,n);break;case 13:ue(u,n,e),e&&i&4&&sr(u,n);break;case 22:n.memoizedState===null&&ue(u,n,e),Eu(n,n.return);break;case 30:break;default:ue(u,n,e)}t=t.sibling}}function qc(l,t){var e=null;l!==null&&l.memoizedState!==null&&l.memoizedState.cachePool!==null&&(e=l.memoizedState.cachePool.pool),l=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(l=t.memoizedState.cachePool.pool),l!==e&&(l!=null&&l.refCount++,e!=null&&cu(e))}function Yc(l,t){l=null,t.alternate!==null&&(l=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==l&&(t.refCount++,l!=null&&cu(l))}function Yt(l,t,e,a){if(t.subtreeFlags&10256)for(t=t.child;t!==null;)dr(l,t,e,a),t=t.sibling}function dr(l,t,e,a){var u=t.flags;switch(t.tag){case 0:case 11:case 15:Yt(l,t,e,a),u&2048&&pu(9,t);break;case 1:Yt(l,t,e,a);break;case 3:Yt(l,t,e,a),u&2048&&(l=null,t.alternate!==null&&(l=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==l&&(t.refCount++,l!=null&&cu(l)));break;case 12:if(u&2048){Yt(l,t,e,a),l=t.stateNode;try{var n=t.memoizedProps,i=n.id,c=n.onPostCommit;typeof c=="function"&&c(i,t.alternate===null?"mount":"update",l.passiveEffectDuration,-0)}catch(f){ml(t,t.return,f)}}else Yt(l,t,e,a);break;case 31:Yt(l,t,e,a);break;case 13:Yt(l,t,e,a);break;case 23:break;case 22:n=t.stateNode,i=t.alternate,t.memoizedState!==null?n._visibility&2?Yt(l,t,e,a):zu(l,t):n._visibility&2?Yt(l,t,e,a):(n._visibility|=2,_a(l,t,e,a,(t.subtreeFlags&10256)!==0||!1)),u&2048&&qc(i,t);break;case 24:Yt(l,t,e,a),u&2048&&Yc(t.alternate,t);break;default:Yt(l,t,e,a)}}function _a(l,t,e,a,u){for(u=u&&((t.subtreeFlags&10256)!==0||!1),t=t.child;t!==null;){var n=l,i=t,c=e,f=a,y=i.flags;switch(i.tag){case 0:case 11:case 15:_a(n,i,c,f,u),pu(8,i);break;case 23:break;case 22:var T=i.stateNode;i.memoizedState!==null?T._visibility&2?_a(n,i,c,f,u):zu(n,i):(T._visibility|=2,_a(n,i,c,f,u)),u&&y&2048&&qc(i.alternate,i);break;case 24:_a(n,i,c,f,u),u&&y&2048&&Yc(i.alternate,i);break;default:_a(n,i,c,f,u)}t=t.sibling}}function zu(l,t){if(t.subtreeFlags&10256)for(t=t.child;t!==null;){var e=l,a=t,u=a.flags;switch(a.tag){case 22:zu(e,a),u&2048&&qc(a.alternate,a);break;case 24:zu(e,a),u&2048&&Yc(a.alternate,a);break;default:zu(e,a)}t=t.sibling}}var Tu=8192;function Oa(l,t,e){if(l.subtreeFlags&Tu)for(l=l.child;l!==null;)mr(l,t,e),l=l.sibling}function mr(l,t,e){switch(l.tag){case 26:Oa(l,t,e),l.flags&Tu&&l.memoizedState!==null&&km(e,qt,l.memoizedState,l.memoizedProps);break;case 5:Oa(l,t,e);break;case 3:case 4:var a=qt;qt=$n(l.stateNode.containerInfo),Oa(l,t,e),qt=a;break;case 22:l.memoizedState===null&&(a=l.alternate,a!==null&&a.memoizedState!==null?(a=Tu,Tu=16777216,Oa(l,t,e),Tu=a):Oa(l,t,e));break;default:Oa(l,t,e)}}function yr(l){var t=l.alternate;if(t!==null&&(l=t.child,l!==null)){t.child=null;do t=l.sibling,l.sibling=null,l=t;while(l!==null)}}function Au(l){var t=l.deletions;if((l.flags&16)!==0){if(t!==null)for(var e=0;e<t.length;e++){var a=t[e];$l=a,hr(a,l)}yr(l)}if(l.subtreeFlags&10256)for(l=l.child;l!==null;)vr(l),l=l.sibling}function vr(l){switch(l.tag){case 0:case 11:case 15:Au(l),l.flags&2048&&ze(9,l,l.return);break;case 3:Au(l);break;case 12:Au(l);break;case 22:var t=l.stateNode;l.memoizedState!==null&&t._visibility&2&&(l.return===null||l.return.tag!==13)?(t._visibility&=-3,Rn(l)):Au(l);break;default:Au(l)}}function Rn(l){var t=l.deletions;if((l.flags&16)!==0){if(t!==null)for(var e=0;e<t.length;e++){var a=t[e];$l=a,hr(a,l)}yr(l)}for(l=l.child;l!==null;){switch(t=l,t.tag){case 0:case 11:case 15:ze(8,t,t.return),Rn(t);break;case 22:e=t.stateNode,e._visibility&2&&(e._visibility&=-3,Rn(t));break;default:Rn(t)}l=l.sibling}}function hr(l,t){for(;$l!==null;){var e=$l;switch(e.tag){case 0:case 11:case 15:ze(8,e,t);break;case 23:case 22:if(e.memoizedState!==null&&e.memoizedState.cachePool!==null){var a=e.memoizedState.cachePool.pool;a!=null&&a.refCount++}break;case 24:cu(e.memoizedState.cache)}if(a=e.child,a!==null)a.return=e,$l=a;else l:for(e=l;$l!==null;){a=$l;var u=a.sibling,n=a.return;if(ir(a),a===e){$l=null;break l}if(u!==null){u.return=n,$l=u;break l}$l=n}}}var om={getCacheForType:function(l){var t=Pl(Gl),e=t.data.get(l);return e===void 0&&(e=l(),t.data.set(l,e)),e},cacheSignal:function(){return Pl(Gl).controller.signal}},rm=typeof WeakMap=="function"?WeakMap:Map,rl=0,El=null,ll=null,ul=0,dl=0,Et=null,Te=!1,Ma=!1,Gc=!1,ne=0,Hl=0,Ae=0,Pe=0,Lc=0,zt=0,Ua=0,xu=null,rt=null,Qc=!1,Bn=0,gr=0,qn=1/0,Yn=null,xe=null,Zl=0,_e=null,Na=null,ie=0,Xc=0,Zc=null,br=null,_u=0,Vc=null;function Tt(){return(rl&2)!==0&&ul!==0?ul&-ul:p.T!==null?Wc():Cf()}function Sr(){if(zt===0)if((ul&536870912)===0||cl){var l=Ku;Ku<<=1,(Ku&3932160)===0&&(Ku=262144),zt=l}else zt=536870912;return l=St.current,l!==null&&(l.flags|=32),zt}function dt(l,t,e){(l===El&&(dl===2||dl===9)||l.cancelPendingCommit!==null)&&(Da(l,0),Oe(l,ul,zt,!1)),Ja(l,e),((rl&2)===0||l!==El)&&(l===El&&((rl&2)===0&&(Pe|=e),Hl===4&&Oe(l,ul,zt,!1)),Zt(l))}function pr(l,t,e){if((rl&6)!==0)throw Error(r(327));var a=!e&&(t&127)===0&&(t&l.expiredLanes)===0||wa(l,t),u=a?ym(l,t):wc(l,t,!0),n=a;do{if(u===0){Ma&&!a&&Oe(l,t,0,!1);break}else{if(e=l.current.alternate,n&&!dm(e)){u=wc(l,t,!1),n=!1;continue}if(u===2){if(n=t,l.errorRecoveryDisabledLanes&n)var i=0;else i=l.pendingLanes&-536870913,i=i!==0?i:i&536870912?536870912:0;if(i!==0){t=i;l:{var c=l;u=xu;var f=c.current.memoizedState.isDehydrated;if(f&&(Da(c,i).flags|=256),i=wc(c,i,!1),i!==2){if(Gc&&!f){c.errorRecoveryDisabledLanes|=n,Pe|=n,u=4;break l}n=rt,rt=u,n!==null&&(rt===null?rt=n:rt.push.apply(rt,n))}u=i}if(n=!1,u!==2)continue}}if(u===1){Da(l,0),Oe(l,t,0,!0);break}l:{switch(a=l,n=u,n){case 0:case 1:throw Error(r(345));case 4:if((t&4194048)!==t)break;case 6:Oe(a,t,zt,!Te);break l;case 2:rt=null;break;case 3:case 5:break;default:throw Error(r(329))}if((t&62914560)===t&&(u=Bn+300-al(),10<u)){if(Oe(a,t,zt,!Te),Ju(a,0,!0)!==0)break l;ie=t,a.timeoutHandle=Fr(Er.bind(null,a,e,rt,Yn,Qc,t,zt,Pe,Ua,Te,n,"Throttled",-0,0),u);break l}Er(a,e,rt,Yn,Qc,t,zt,Pe,Ua,Te,n,null,-0,0)}}break}while(!0);Zt(l)}function Er(l,t,e,a,u,n,i,c,f,y,T,_,h,S){if(l.timeoutHandle=-1,_=t.subtreeFlags,_&8192||(_&16785408)===16785408){_={stylesheets:null,count:0,imgCount:0,imgBytes:0,suspenseyImages:[],waitingForImages:!0,waitingForViewTransition:!1,unsuspend:Kt},mr(t,n,_);var q=(n&62914560)===n?Bn-al():(n&4194048)===n?gr-al():0;if(q=Wm(_,q),q!==null){ie=n,l.cancelPendingCommit=q(Ur.bind(null,l,t,n,e,a,u,i,c,f,T,_,null,h,S)),Oe(l,n,i,!y);return}}Ur(l,t,n,e,a,u,i,c,f)}function dm(l){for(var t=l;;){var e=t.tag;if((e===0||e===11||e===15)&&t.flags&16384&&(e=t.updateQueue,e!==null&&(e=e.stores,e!==null)))for(var a=0;a<e.length;a++){var u=e[a],n=u.getSnapshot;u=u.value;try{if(!gt(n(),u))return!1}catch{return!1}}if(e=t.child,t.subtreeFlags&16384&&e!==null)e.return=t,t=e;else{if(t===l)break;for(;t.sibling===null;){if(t.return===null||t.return===l)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function Oe(l,t,e,a){t&=~Lc,t&=~Pe,l.suspendedLanes|=t,l.pingedLanes&=~t,a&&(l.warmLanes|=t),a=l.expirationTimes;for(var u=t;0<u;){var n=31-ht(u),i=1<<n;a[n]=-1,u&=~i}e!==0&&Nf(l,e,t)}function Gn(){return(rl&6)===0?(Ou(0),!1):!0}function Kc(){if(ll!==null){if(dl===0)var l=ll.return;else l=ll,kt=Ze=null,cc(l),Ea=null,su=0,l=ll;for(;l!==null;)Po(l.alternate,l),l=l.return;ll=null}}function Da(l,t){var e=l.timeoutHandle;e!==-1&&(l.timeoutHandle=-1,jm(e)),e=l.cancelPendingCommit,e!==null&&(l.cancelPendingCommit=null,e()),ie=0,Kc(),El=l,ll=e=Jt(l.current,null),ul=t,dl=0,Et=null,Te=!1,Ma=wa(l,t),Gc=!1,Ua=zt=Lc=Pe=Ae=Hl=0,rt=xu=null,Qc=!1,(t&8)!==0&&(t|=t&32);var a=l.entangledLanes;if(a!==0)for(l=l.entanglements,a&=t;0<a;){var u=31-ht(a),n=1<<u;t|=l[u],a&=~n}return ne=t,nn(),e}function zr(l,t){W=null,p.H=gu,t===pa||t===yn?(t=qs(),dl=3):t===ki?(t=qs(),dl=4):dl=t===Tc?8:t!==null&&typeof t=="object"&&typeof t.then=="function"?6:1,Et=t,ll===null&&(Hl=1,Mn(l,Mt(t,l.current)))}function Tr(){var l=St.current;return l===null?!0:(ul&4194048)===ul?jt===null:(ul&62914560)===ul||(ul&536870912)!==0?l===jt:!1}function Ar(){var l=p.H;return p.H=gu,l===null?gu:l}function xr(){var l=p.A;return p.A=om,l}function Ln(){Hl=4,Te||(ul&4194048)!==ul&&St.current!==null||(Ma=!0),(Ae&134217727)===0&&(Pe&134217727)===0||El===null||Oe(El,ul,zt,!1)}function wc(l,t,e){var a=rl;rl|=2;var u=Ar(),n=xr();(El!==l||ul!==t)&&(Yn=null,Da(l,t)),t=!1;var i=Hl;l:do try{if(dl!==0&&ll!==null){var c=ll,f=Et;switch(dl){case 8:Kc(),i=6;break l;case 3:case 2:case 9:case 6:St.current===null&&(t=!0);var y=dl;if(dl=0,Et=null,ja(l,c,f,y),e&&Ma){i=0;break l}break;default:y=dl,dl=0,Et=null,ja(l,c,f,y)}}mm(),i=Hl;break}catch(T){zr(l,T)}while(!0);return t&&l.shellSuspendCounter++,kt=Ze=null,rl=a,p.H=u,p.A=n,ll===null&&(El=null,ul=0,nn()),i}function mm(){for(;ll!==null;)_r(ll)}function ym(l,t){var e=rl;rl|=2;var a=Ar(),u=xr();El!==l||ul!==t?(Yn=null,qn=al()+500,Da(l,t)):Ma=wa(l,t);l:do try{if(dl!==0&&ll!==null){t=ll;var n=Et;t:switch(dl){case 1:dl=0,Et=null,ja(l,t,n,1);break;case 2:case 9:if(Rs(n)){dl=0,Et=null,Or(t);break}t=function(){dl!==2&&dl!==9||El!==l||(dl=7),Zt(l)},n.then(t,t);break l;case 3:dl=7;break l;case 4:dl=5;break l;case 7:Rs(n)?(dl=0,Et=null,Or(t)):(dl=0,Et=null,ja(l,t,n,7));break;case 5:var i=null;switch(ll.tag){case 26:i=ll.memoizedState;case 5:case 27:var c=ll;if(i?dd(i):c.stateNode.complete){dl=0,Et=null;var f=c.sibling;if(f!==null)ll=f;else{var y=c.return;y!==null?(ll=y,Qn(y)):ll=null}break t}}dl=0,Et=null,ja(l,t,n,5);break;case 6:dl=0,Et=null,ja(l,t,n,6);break;case 8:Kc(),Hl=6;break l;default:throw Error(r(462))}}vm();break}catch(T){zr(l,T)}while(!0);return kt=Ze=null,p.H=a,p.A=u,rl=e,ll!==null?0:(El=null,ul=0,nn(),Hl)}function vm(){for(;ll!==null&&!k();)_r(ll)}function _r(l){var t=Wo(l.alternate,l,ne);l.memoizedProps=l.pendingProps,t===null?Qn(l):ll=t}function Or(l){var t=l,e=t.alternate;switch(t.tag){case 15:case 0:t=Vo(e,t,t.pendingProps,t.type,void 0,ul);break;case 11:t=Vo(e,t,t.pendingProps,t.type.render,t.ref,ul);break;case 5:cc(t);default:Po(e,t),t=ll=As(t,ne),t=Wo(e,t,ne)}l.memoizedProps=l.pendingProps,t===null?Qn(l):ll=t}function ja(l,t,e,a){kt=Ze=null,cc(t),Ea=null,su=0;var u=t.return;try{if(am(l,u,t,e,ul)){Hl=1,Mn(l,Mt(e,l.current)),ll=null;return}}catch(n){if(u!==null)throw ll=u,n;Hl=1,Mn(l,Mt(e,l.current)),ll=null;return}t.flags&32768?(cl||a===1?l=!0:Ma||(ul&536870912)!==0?l=!1:(Te=l=!0,(a===2||a===9||a===3||a===6)&&(a=St.current,a!==null&&a.tag===13&&(a.flags|=16384))),Mr(t,l)):Qn(t)}function Qn(l){var t=l;do{if((t.flags&32768)!==0){Mr(t,Te);return}l=t.return;var e=im(t.alternate,t,ne);if(e!==null){ll=e;return}if(t=t.sibling,t!==null){ll=t;return}ll=t=l}while(t!==null);Hl===0&&(Hl=5)}function Mr(l,t){do{var e=cm(l.alternate,l);if(e!==null){e.flags&=32767,ll=e;return}if(e=l.return,e!==null&&(e.flags|=32768,e.subtreeFlags=0,e.deletions=null),!t&&(l=l.sibling,l!==null)){ll=l;return}ll=l=e}while(l!==null);Hl=6,ll=null}function Ur(l,t,e,a,u,n,i,c,f){l.cancelPendingCommit=null;do Xn();while(Zl!==0);if((rl&6)!==0)throw Error(r(327));if(t!==null){if(t===l.current)throw Error(r(177));if(n=t.lanes|t.childLanes,n|=Hi,$d(l,e,n,i,c,f),l===El&&(ll=El=null,ul=0),Na=t,_e=l,ie=e,Xc=n,Zc=u,br=a,(t.subtreeFlags&10256)!==0||(t.flags&10256)!==0?(l.callbackNode=null,l.callbackPriority=0,Sm(xl,function(){return Hr(),null})):(l.callbackNode=null,l.callbackPriority=0),a=(t.flags&13878)!==0,(t.subtreeFlags&13878)!==0||a){a=p.T,p.T=null,u=D.p,D.p=2,i=rl,rl|=4;try{fm(l,t,e)}finally{rl=i,D.p=u,p.T=a}}Zl=1,Nr(),Dr(),jr()}}function Nr(){if(Zl===1){Zl=0;var l=_e,t=Na,e=(t.flags&13878)!==0;if((t.subtreeFlags&13878)!==0||e){e=p.T,p.T=null;var a=D.p;D.p=2;var u=rl;rl|=4;try{or(t,l);var n=uf,i=vs(l.containerInfo),c=n.focusedElem,f=n.selectionRange;if(i!==c&&c&&c.ownerDocument&&ys(c.ownerDocument.documentElement,c)){if(f!==null&&Ui(c)){var y=f.start,T=f.end;if(T===void 0&&(T=y),"selectionStart"in c)c.selectionStart=y,c.selectionEnd=Math.min(T,c.value.length);else{var _=c.ownerDocument||document,h=_&&_.defaultView||window;if(h.getSelection){var S=h.getSelection(),q=c.textContent.length,V=Math.min(f.start,q),Sl=f.end===void 0?V:Math.min(f.end,q);!S.extend&&V>Sl&&(i=Sl,Sl=V,V=i);var d=ms(c,V),o=ms(c,Sl);if(d&&o&&(S.rangeCount!==1||S.anchorNode!==d.node||S.anchorOffset!==d.offset||S.focusNode!==o.node||S.focusOffset!==o.offset)){var m=_.createRange();m.setStart(d.node,d.offset),S.removeAllRanges(),V>Sl?(S.addRange(m),S.extend(o.node,o.offset)):(m.setEnd(o.node,o.offset),S.addRange(m))}}}}for(_=[],S=c;S=S.parentNode;)S.nodeType===1&&_.push({element:S,left:S.scrollLeft,top:S.scrollTop});for(typeof c.focus=="function"&&c.focus(),c=0;c<_.length;c++){var A=_[c];A.element.scrollLeft=A.left,A.element.scrollTop=A.top}}li=!!af,uf=af=null}finally{rl=u,D.p=a,p.T=e}}l.current=t,Zl=2}}function Dr(){if(Zl===2){Zl=0;var l=_e,t=Na,e=(t.flags&8772)!==0;if((t.subtreeFlags&8772)!==0||e){e=p.T,p.T=null;var a=D.p;D.p=2;var u=rl;rl|=4;try{nr(l,t.alternate,t)}finally{rl=u,D.p=a,p.T=e}}Zl=3}}function jr(){if(Zl===4||Zl===3){Zl=0,hl();var l=_e,t=Na,e=ie,a=br;(t.subtreeFlags&10256)!==0||(t.flags&10256)!==0?Zl=5:(Zl=0,Na=_e=null,Cr(l,l.pendingLanes));var u=l.pendingLanes;if(u===0&&(xe=null),oi(e),t=t.stateNode,vt&&typeof vt.onCommitFiberRoot=="function")try{vt.onCommitFiberRoot(Ka,t,void 0,(t.current.flags&128)===128)}catch{}if(a!==null){t=p.T,u=D.p,D.p=2,p.T=null;try{for(var n=l.onRecoverableError,i=0;i<a.length;i++){var c=a[i];n(c.value,{componentStack:c.stack})}}finally{p.T=t,D.p=u}}(ie&3)!==0&&Xn(),Zt(l),u=l.pendingLanes,(e&261930)!==0&&(u&42)!==0?l===Vc?_u++:(_u=0,Vc=l):_u=0,Ou(0)}}function Cr(l,t){(l.pooledCacheLanes&=t)===0&&(t=l.pooledCache,t!=null&&(l.pooledCache=null,cu(t)))}function Xn(){return Nr(),Dr(),jr(),Hr()}function Hr(){if(Zl!==5)return!1;var l=_e,t=Xc;Xc=0;var e=oi(ie),a=p.T,u=D.p;try{D.p=32>e?32:e,p.T=null,e=Zc,Zc=null;var n=_e,i=ie;if(Zl=0,Na=_e=null,ie=0,(rl&6)!==0)throw Error(r(331));var c=rl;if(rl|=4,vr(n.current),dr(n,n.current,i,e),rl=c,Ou(0,!1),vt&&typeof vt.onPostCommitFiberRoot=="function")try{vt.onPostCommitFiberRoot(Ka,n)}catch{}return!0}finally{D.p=u,p.T=a,Cr(l,t)}}function Rr(l,t,e){t=Mt(e,t),t=zc(l.stateNode,t,2),l=Se(l,t,2),l!==null&&(Ja(l,2),Zt(l))}function ml(l,t,e){if(l.tag===3)Rr(l,l,e);else for(;t!==null;){if(t.tag===3){Rr(t,l,e);break}else if(t.tag===1){var a=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof a.componentDidCatch=="function"&&(xe===null||!xe.has(a))){l=Mt(e,l),e=Bo(2),a=Se(t,e,2),a!==null&&(qo(e,a,t,l),Ja(a,2),Zt(a));break}}t=t.return}}function Jc(l,t,e){var a=l.pingCache;if(a===null){a=l.pingCache=new rm;var u=new Set;a.set(t,u)}else u=a.get(t),u===void 0&&(u=new Set,a.set(t,u));u.has(e)||(Gc=!0,u.add(e),l=hm.bind(null,l,t,e),t.then(l,l))}function hm(l,t,e){var a=l.pingCache;a!==null&&a.delete(t),l.pingedLanes|=l.suspendedLanes&e,l.warmLanes&=~e,El===l&&(ul&e)===e&&(Hl===4||Hl===3&&(ul&62914560)===ul&&300>al()-Bn?(rl&2)===0&&Da(l,0):Lc|=e,Ua===ul&&(Ua=0)),Zt(l)}function Br(l,t){t===0&&(t=Uf()),l=Le(l,t),l!==null&&(Ja(l,t),Zt(l))}function gm(l){var t=l.memoizedState,e=0;t!==null&&(e=t.retryLane),Br(l,e)}function bm(l,t){var e=0;switch(l.tag){case 31:case 13:var a=l.stateNode,u=l.memoizedState;u!==null&&(e=u.retryLane);break;case 19:a=l.stateNode;break;case 22:a=l.stateNode._retryCache;break;default:throw Error(r(314))}a!==null&&a.delete(t),Br(l,e)}function Sm(l,t){return Za(l,t)}var Zn=null,Ca=null,$c=!1,Vn=!1,kc=!1,Me=0;function Zt(l){l!==Ca&&l.next===null&&(Ca===null?Zn=Ca=l:Ca=Ca.next=l),Vn=!0,$c||($c=!0,Em())}function Ou(l,t){if(!kc&&Vn){kc=!0;do for(var e=!1,a=Zn;a!==null;){if(l!==0){var u=a.pendingLanes;if(u===0)var n=0;else{var i=a.suspendedLanes,c=a.pingedLanes;n=(1<<31-ht(42|l)+1)-1,n&=u&~(i&~c),n=n&201326741?n&201326741|1:n?n|2:0}n!==0&&(e=!0,Lr(a,n))}else n=ul,n=Ju(a,a===El?n:0,a.cancelPendingCommit!==null||a.timeoutHandle!==-1),(n&3)===0||wa(a,n)||(e=!0,Lr(a,n));a=a.next}while(e);kc=!1}}function pm(){qr()}function qr(){Vn=$c=!1;var l=0;Me!==0&&Dm()&&(l=Me);for(var t=al(),e=null,a=Zn;a!==null;){var u=a.next,n=Yr(a,t);n===0?(a.next=null,e===null?Zn=u:e.next=u,u===null&&(Ca=e)):(e=a,(l!==0||(n&3)!==0)&&(Vn=!0)),a=u}Zl!==0&&Zl!==5||Ou(l),Me!==0&&(Me=0)}function Yr(l,t){for(var e=l.suspendedLanes,a=l.pingedLanes,u=l.expirationTimes,n=l.pendingLanes&-62914561;0<n;){var i=31-ht(n),c=1<<i,f=u[i];f===-1?((c&e)===0||(c&a)!==0)&&(u[i]=Jd(c,t)):f<=t&&(l.expiredLanes|=c),n&=~c}if(t=El,e=ul,e=Ju(l,l===t?e:0,l.cancelPendingCommit!==null||l.timeoutHandle!==-1),a=l.callbackNode,e===0||l===t&&(dl===2||dl===9)||l.cancelPendingCommit!==null)return a!==null&&a!==null&&z(a),l.callbackNode=null,l.callbackPriority=0;if((e&3)===0||wa(l,e)){if(t=e&-e,t===l.callbackPriority)return t;switch(a!==null&&z(a),oi(e)){case 2:case 8:e=yt;break;case 32:e=xl;break;case 268435456:e=Zu;break;default:e=xl}return a=Gr.bind(null,l),e=Za(e,a),l.callbackPriority=t,l.callbackNode=e,t}return a!==null&&a!==null&&z(a),l.callbackPriority=2,l.callbackNode=null,2}function Gr(l,t){if(Zl!==0&&Zl!==5)return l.callbackNode=null,l.callbackPriority=0,null;var e=l.callbackNode;if(Xn()&&l.callbackNode!==e)return null;var a=ul;return a=Ju(l,l===El?a:0,l.cancelPendingCommit!==null||l.timeoutHandle!==-1),a===0?null:(pr(l,a,t),Yr(l,al()),l.callbackNode!=null&&l.callbackNode===e?Gr.bind(null,l):null)}function Lr(l,t){if(Xn())return null;pr(l,t,!0)}function Em(){Cm(function(){(rl&6)!==0?Za(wl,pm):qr()})}function Wc(){if(Me===0){var l=ba;l===0&&(l=Vu,Vu<<=1,(Vu&261888)===0&&(Vu=256)),Me=l}return Me}function Qr(l){return l==null||typeof l=="symbol"||typeof l=="boolean"?null:typeof l=="function"?l:Fu(""+l)}function Xr(l,t){var e=t.ownerDocument.createElement("input");return e.name=t.name,e.value=t.value,l.id&&e.setAttribute("form",l.id),t.parentNode.insertBefore(e,t),l=new FormData(l),e.parentNode.removeChild(e),l}function zm(l,t,e,a,u){if(t==="submit"&&e&&e.stateNode===u){var n=Qr((u[it]||null).action),i=a.submitter;i&&(t=(t=i[it]||null)?Qr(t.formAction):i.getAttribute("formAction"),t!==null&&(n=t,i=null));var c=new tn("action","action",null,a,u);l.push({event:c,listeners:[{instance:null,listener:function(){if(a.defaultPrevented){if(Me!==0){var f=i?Xr(u,i):new FormData(u);hc(e,{pending:!0,data:f,method:u.method,action:n},null,f)}}else typeof n=="function"&&(c.preventDefault(),f=i?Xr(u,i):new FormData(u),hc(e,{pending:!0,data:f,method:u.method,action:n},n,f))},currentTarget:u}]})}}for(var Fc=0;Fc<Ci.length;Fc++){var Pc=Ci[Fc],Tm=Pc.toLowerCase(),Am=Pc[0].toUpperCase()+Pc.slice(1);Bt(Tm,"on"+Am)}Bt(bs,"onAnimationEnd"),Bt(Ss,"onAnimationIteration"),Bt(ps,"onAnimationStart"),Bt("dblclick","onDoubleClick"),Bt("focusin","onFocus"),Bt("focusout","onBlur"),Bt(L0,"onTransitionRun"),Bt(Q0,"onTransitionStart"),Bt(X0,"onTransitionCancel"),Bt(Es,"onTransitionEnd"),ua("onMouseEnter",["mouseout","mouseover"]),ua("onMouseLeave",["mouseout","mouseover"]),ua("onPointerEnter",["pointerout","pointerover"]),ua("onPointerLeave",["pointerout","pointerover"]),Be("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),Be("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),Be("onBeforeInput",["compositionend","keypress","textInput","paste"]),Be("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),Be("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),Be("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Mu="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),xm=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Mu));function Zr(l,t){t=(t&4)!==0;for(var e=0;e<l.length;e++){var a=l[e],u=a.event;a=a.listeners;l:{var n=void 0;if(t)for(var i=a.length-1;0<=i;i--){var c=a[i],f=c.instance,y=c.currentTarget;if(c=c.listener,f!==n&&u.isPropagationStopped())break l;n=c,u.currentTarget=y;try{n(u)}catch(T){un(T)}u.currentTarget=null,n=f}else for(i=0;i<a.length;i++){if(c=a[i],f=c.instance,y=c.currentTarget,c=c.listener,f!==n&&u.isPropagationStopped())break l;n=c,u.currentTarget=y;try{n(u)}catch(T){un(T)}u.currentTarget=null,n=f}}}}function tl(l,t){var e=t[ri];e===void 0&&(e=t[ri]=new Set);var a=l+"__bubble";e.has(a)||(Vr(t,l,2,!1),e.add(a))}function Ic(l,t,e){var a=0;t&&(a|=4),Vr(e,l,a,t)}var Kn="_reactListening"+Math.random().toString(36).slice(2);function lf(l){if(!l[Kn]){l[Kn]=!0,Bf.forEach(function(e){e!=="selectionchange"&&(xm.has(e)||Ic(e,!1,l),Ic(e,!0,l))});var t=l.nodeType===9?l:l.ownerDocument;t===null||t[Kn]||(t[Kn]=!0,Ic("selectionchange",!1,t))}}function Vr(l,t,e,a){switch(Sd(t)){case 2:var u=Im;break;case 8:u=ly;break;default:u=hf}e=u.bind(null,t,e,l),u=void 0,!pi||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(u=!0),a?u!==void 0?l.addEventListener(t,e,{capture:!0,passive:u}):l.addEventListener(t,e,!0):u!==void 0?l.addEventListener(t,e,{passive:u}):l.addEventListener(t,e,!1)}function tf(l,t,e,a,u){var n=a;if((t&1)===0&&(t&2)===0&&a!==null)l:for(;;){if(a===null)return;var i=a.tag;if(i===3||i===4){var c=a.stateNode.containerInfo;if(c===u)break;if(i===4)for(i=a.return;i!==null;){var f=i.tag;if((f===3||f===4)&&i.stateNode.containerInfo===u)return;i=i.return}for(;c!==null;){if(i=ta(c),i===null)return;if(f=i.tag,f===5||f===6||f===26||f===27){a=n=i;continue l}c=c.parentNode}}a=a.return}$f(function(){var y=n,T=bi(e),_=[];l:{var h=zs.get(l);if(h!==void 0){var S=tn,q=l;switch(l){case"keypress":if(Iu(e)===0)break l;case"keydown":case"keyup":S=b0;break;case"focusin":q="focus",S=Ai;break;case"focusout":q="blur",S=Ai;break;case"beforeblur":case"afterblur":S=Ai;break;case"click":if(e.button===2)break l;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":S=Ff;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":S=i0;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":S=E0;break;case bs:case Ss:case ps:S=s0;break;case Es:S=T0;break;case"scroll":case"scrollend":S=u0;break;case"wheel":S=x0;break;case"copy":case"cut":case"paste":S=r0;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":S=If;break;case"toggle":case"beforetoggle":S=O0}var V=(t&4)!==0,Sl=!V&&(l==="scroll"||l==="scrollend"),d=V?h!==null?h+"Capture":null:h;V=[];for(var o=y,m;o!==null;){var A=o;if(m=A.stateNode,A=A.tag,A!==5&&A!==26&&A!==27||m===null||d===null||(A=Wa(o,d),A!=null&&V.push(Uu(o,A,m))),Sl)break;o=o.return}0<V.length&&(h=new S(h,q,null,e,T),_.push({event:h,listeners:V}))}}if((t&7)===0){l:{if(h=l==="mouseover"||l==="pointerover",S=l==="mouseout"||l==="pointerout",h&&e!==gi&&(q=e.relatedTarget||e.fromElement)&&(ta(q)||q[la]))break l;if((S||h)&&(h=T.window===T?T:(h=T.ownerDocument)?h.defaultView||h.parentWindow:window,S?(q=e.relatedTarget||e.toElement,S=y,q=q?ta(q):null,q!==null&&(Sl=M(q),V=q.tag,q!==Sl||V!==5&&V!==27&&V!==6)&&(q=null)):(S=null,q=y),S!==q)){if(V=Ff,A="onMouseLeave",d="onMouseEnter",o="mouse",(l==="pointerout"||l==="pointerover")&&(V=If,A="onPointerLeave",d="onPointerEnter",o="pointer"),Sl=S==null?h:ka(S),m=q==null?h:ka(q),h=new V(A,o+"leave",S,e,T),h.target=Sl,h.relatedTarget=m,A=null,ta(T)===y&&(V=new V(d,o+"enter",q,e,T),V.target=m,V.relatedTarget=Sl,A=V),Sl=A,S&&q)t:{for(V=_m,d=S,o=q,m=0,A=d;A;A=V(A))m++;A=0;for(var Q=o;Q;Q=V(Q))A++;for(;0<m-A;)d=V(d),m--;for(;0<A-m;)o=V(o),A--;for(;m--;){if(d===o||o!==null&&d===o.alternate){V=d;break t}d=V(d),o=V(o)}V=null}else V=null;S!==null&&Kr(_,h,S,V,!1),q!==null&&Sl!==null&&Kr(_,Sl,q,V,!0)}}l:{if(h=y?ka(y):window,S=h.nodeName&&h.nodeName.toLowerCase(),S==="select"||S==="input"&&h.type==="file")var sl=cs;else if(ns(h))if(fs)sl=q0;else{sl=R0;var Y=H0}else S=h.nodeName,!S||S.toLowerCase()!=="input"||h.type!=="checkbox"&&h.type!=="radio"?y&&hi(y.elementType)&&(sl=cs):sl=B0;if(sl&&(sl=sl(l,y))){is(_,sl,e,T);break l}Y&&Y(l,h,y),l==="focusout"&&y&&h.type==="number"&&y.memoizedProps.value!=null&&vi(h,"number",h.value)}switch(Y=y?ka(y):window,l){case"focusin":(ns(Y)||Y.contentEditable==="true")&&(oa=Y,Ni=y,uu=null);break;case"focusout":uu=Ni=oa=null;break;case"mousedown":Di=!0;break;case"contextmenu":case"mouseup":case"dragend":Di=!1,hs(_,e,T);break;case"selectionchange":if(G0)break;case"keydown":case"keyup":hs(_,e,T)}var F;if(_i)l:{switch(l){case"compositionstart":var nl="onCompositionStart";break l;case"compositionend":nl="onCompositionEnd";break l;case"compositionupdate":nl="onCompositionUpdate";break l}nl=void 0}else sa?as(l,e)&&(nl="onCompositionEnd"):l==="keydown"&&e.keyCode===229&&(nl="onCompositionStart");nl&&(ls&&e.locale!=="ko"&&(sa||nl!=="onCompositionStart"?nl==="onCompositionEnd"&&sa&&(F=kf()):(de=T,Ei="value"in de?de.value:de.textContent,sa=!0)),Y=wn(y,nl),0<Y.length&&(nl=new Pf(nl,l,null,e,T),_.push({event:nl,listeners:Y}),F?nl.data=F:(F=us(e),F!==null&&(nl.data=F)))),(F=U0?N0(l,e):D0(l,e))&&(nl=wn(y,"onBeforeInput"),0<nl.length&&(Y=new Pf("onBeforeInput","beforeinput",null,e,T),_.push({event:Y,listeners:nl}),Y.data=F)),zm(_,l,y,e,T)}Zr(_,t)})}function Uu(l,t,e){return{instance:l,listener:t,currentTarget:e}}function wn(l,t){for(var e=t+"Capture",a=[];l!==null;){var u=l,n=u.stateNode;if(u=u.tag,u!==5&&u!==26&&u!==27||n===null||(u=Wa(l,e),u!=null&&a.unshift(Uu(l,u,n)),u=Wa(l,t),u!=null&&a.push(Uu(l,u,n))),l.tag===3)return a;l=l.return}return[]}function _m(l){if(l===null)return null;do l=l.return;while(l&&l.tag!==5&&l.tag!==27);return l||null}function Kr(l,t,e,a,u){for(var n=t._reactName,i=[];e!==null&&e!==a;){var c=e,f=c.alternate,y=c.stateNode;if(c=c.tag,f!==null&&f===a)break;c!==5&&c!==26&&c!==27||y===null||(f=y,u?(y=Wa(e,n),y!=null&&i.unshift(Uu(e,y,f))):u||(y=Wa(e,n),y!=null&&i.push(Uu(e,y,f)))),e=e.return}i.length!==0&&l.push({event:t,listeners:i})}var Om=/\r\n?/g,Mm=/\u0000|\uFFFD/g;function wr(l){return(typeof l=="string"?l:""+l).replace(Om,`
`).replace(Mm,"")}function Jr(l,t){return t=wr(t),wr(l)===t}function bl(l,t,e,a,u,n){switch(e){case"children":typeof a=="string"?t==="body"||t==="textarea"&&a===""||ia(l,a):(typeof a=="number"||typeof a=="bigint")&&t!=="body"&&ia(l,""+a);break;case"className":ku(l,"class",a);break;case"tabIndex":ku(l,"tabindex",a);break;case"dir":case"role":case"viewBox":case"width":case"height":ku(l,e,a);break;case"style":wf(l,a,n);break;case"data":if(t!=="object"){ku(l,"data",a);break}case"src":case"href":if(a===""&&(t!=="a"||e!=="href")){l.removeAttribute(e);break}if(a==null||typeof a=="function"||typeof a=="symbol"||typeof a=="boolean"){l.removeAttribute(e);break}a=Fu(""+a),l.setAttribute(e,a);break;case"action":case"formAction":if(typeof a=="function"){l.setAttribute(e,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof n=="function"&&(e==="formAction"?(t!=="input"&&bl(l,t,"name",u.name,u,null),bl(l,t,"formEncType",u.formEncType,u,null),bl(l,t,"formMethod",u.formMethod,u,null),bl(l,t,"formTarget",u.formTarget,u,null)):(bl(l,t,"encType",u.encType,u,null),bl(l,t,"method",u.method,u,null),bl(l,t,"target",u.target,u,null)));if(a==null||typeof a=="symbol"||typeof a=="boolean"){l.removeAttribute(e);break}a=Fu(""+a),l.setAttribute(e,a);break;case"onClick":a!=null&&(l.onclick=Kt);break;case"onScroll":a!=null&&tl("scroll",l);break;case"onScrollEnd":a!=null&&tl("scrollend",l);break;case"dangerouslySetInnerHTML":if(a!=null){if(typeof a!="object"||!("__html"in a))throw Error(r(61));if(e=a.__html,e!=null){if(u.children!=null)throw Error(r(60));l.innerHTML=e}}break;case"multiple":l.multiple=a&&typeof a!="function"&&typeof a!="symbol";break;case"muted":l.muted=a&&typeof a!="function"&&typeof a!="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(a==null||typeof a=="function"||typeof a=="boolean"||typeof a=="symbol"){l.removeAttribute("xlink:href");break}e=Fu(""+a),l.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",e);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":a!=null&&typeof a!="function"&&typeof a!="symbol"?l.setAttribute(e,""+a):l.removeAttribute(e);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":a&&typeof a!="function"&&typeof a!="symbol"?l.setAttribute(e,""):l.removeAttribute(e);break;case"capture":case"download":a===!0?l.setAttribute(e,""):a!==!1&&a!=null&&typeof a!="function"&&typeof a!="symbol"?l.setAttribute(e,a):l.removeAttribute(e);break;case"cols":case"rows":case"size":case"span":a!=null&&typeof a!="function"&&typeof a!="symbol"&&!isNaN(a)&&1<=a?l.setAttribute(e,a):l.removeAttribute(e);break;case"rowSpan":case"start":a==null||typeof a=="function"||typeof a=="symbol"||isNaN(a)?l.removeAttribute(e):l.setAttribute(e,a);break;case"popover":tl("beforetoggle",l),tl("toggle",l),$u(l,"popover",a);break;case"xlinkActuate":Vt(l,"http://www.w3.org/1999/xlink","xlink:actuate",a);break;case"xlinkArcrole":Vt(l,"http://www.w3.org/1999/xlink","xlink:arcrole",a);break;case"xlinkRole":Vt(l,"http://www.w3.org/1999/xlink","xlink:role",a);break;case"xlinkShow":Vt(l,"http://www.w3.org/1999/xlink","xlink:show",a);break;case"xlinkTitle":Vt(l,"http://www.w3.org/1999/xlink","xlink:title",a);break;case"xlinkType":Vt(l,"http://www.w3.org/1999/xlink","xlink:type",a);break;case"xmlBase":Vt(l,"http://www.w3.org/XML/1998/namespace","xml:base",a);break;case"xmlLang":Vt(l,"http://www.w3.org/XML/1998/namespace","xml:lang",a);break;case"xmlSpace":Vt(l,"http://www.w3.org/XML/1998/namespace","xml:space",a);break;case"is":$u(l,"is",a);break;case"innerText":case"textContent":break;default:(!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(e=e0.get(e)||e,$u(l,e,a))}}function ef(l,t,e,a,u,n){switch(e){case"style":wf(l,a,n);break;case"dangerouslySetInnerHTML":if(a!=null){if(typeof a!="object"||!("__html"in a))throw Error(r(61));if(e=a.__html,e!=null){if(u.children!=null)throw Error(r(60));l.innerHTML=e}}break;case"children":typeof a=="string"?ia(l,a):(typeof a=="number"||typeof a=="bigint")&&ia(l,""+a);break;case"onScroll":a!=null&&tl("scroll",l);break;case"onScrollEnd":a!=null&&tl("scrollend",l);break;case"onClick":a!=null&&(l.onclick=Kt);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(!qf.hasOwnProperty(e))l:{if(e[0]==="o"&&e[1]==="n"&&(u=e.endsWith("Capture"),t=e.slice(2,u?e.length-7:void 0),n=l[it]||null,n=n!=null?n[e]:null,typeof n=="function"&&l.removeEventListener(t,n,u),typeof a=="function")){typeof n!="function"&&n!==null&&(e in l?l[e]=null:l.hasAttribute(e)&&l.removeAttribute(e)),l.addEventListener(t,a,u);break l}e in l?l[e]=a:a===!0?l.setAttribute(e,""):$u(l,e,a)}}}function lt(l,t,e){switch(t){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":tl("error",l),tl("load",l);var a=!1,u=!1,n;for(n in e)if(e.hasOwnProperty(n)){var i=e[n];if(i!=null)switch(n){case"src":a=!0;break;case"srcSet":u=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(r(137,t));default:bl(l,t,n,i,e,null)}}u&&bl(l,t,"srcSet",e.srcSet,e,null),a&&bl(l,t,"src",e.src,e,null);return;case"input":tl("invalid",l);var c=n=i=u=null,f=null,y=null;for(a in e)if(e.hasOwnProperty(a)){var T=e[a];if(T!=null)switch(a){case"name":u=T;break;case"type":i=T;break;case"checked":f=T;break;case"defaultChecked":y=T;break;case"value":n=T;break;case"defaultValue":c=T;break;case"children":case"dangerouslySetInnerHTML":if(T!=null)throw Error(r(137,t));break;default:bl(l,t,a,T,e,null)}}Xf(l,n,c,f,y,i,u,!1);return;case"select":tl("invalid",l),a=i=n=null;for(u in e)if(e.hasOwnProperty(u)&&(c=e[u],c!=null))switch(u){case"value":n=c;break;case"defaultValue":i=c;break;case"multiple":a=c;default:bl(l,t,u,c,e,null)}t=n,e=i,l.multiple=!!a,t!=null?na(l,!!a,t,!1):e!=null&&na(l,!!a,e,!0);return;case"textarea":tl("invalid",l),n=u=a=null;for(i in e)if(e.hasOwnProperty(i)&&(c=e[i],c!=null))switch(i){case"value":a=c;break;case"defaultValue":u=c;break;case"children":n=c;break;case"dangerouslySetInnerHTML":if(c!=null)throw Error(r(91));break;default:bl(l,t,i,c,e,null)}Vf(l,a,u,n);return;case"option":for(f in e)if(e.hasOwnProperty(f)&&(a=e[f],a!=null))switch(f){case"selected":l.selected=a&&typeof a!="function"&&typeof a!="symbol";break;default:bl(l,t,f,a,e,null)}return;case"dialog":tl("beforetoggle",l),tl("toggle",l),tl("cancel",l),tl("close",l);break;case"iframe":case"object":tl("load",l);break;case"video":case"audio":for(a=0;a<Mu.length;a++)tl(Mu[a],l);break;case"image":tl("error",l),tl("load",l);break;case"details":tl("toggle",l);break;case"embed":case"source":case"link":tl("error",l),tl("load",l);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for(y in e)if(e.hasOwnProperty(y)&&(a=e[y],a!=null))switch(y){case"children":case"dangerouslySetInnerHTML":throw Error(r(137,t));default:bl(l,t,y,a,e,null)}return;default:if(hi(t)){for(T in e)e.hasOwnProperty(T)&&(a=e[T],a!==void 0&&ef(l,t,T,a,e,void 0));return}}for(c in e)e.hasOwnProperty(c)&&(a=e[c],a!=null&&bl(l,t,c,a,e,null))}function Um(l,t,e,a){switch(t){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var u=null,n=null,i=null,c=null,f=null,y=null,T=null;for(S in e){var _=e[S];if(e.hasOwnProperty(S)&&_!=null)switch(S){case"checked":break;case"value":break;case"defaultValue":f=_;default:a.hasOwnProperty(S)||bl(l,t,S,null,a,_)}}for(var h in a){var S=a[h];if(_=e[h],a.hasOwnProperty(h)&&(S!=null||_!=null))switch(h){case"type":n=S;break;case"name":u=S;break;case"checked":y=S;break;case"defaultChecked":T=S;break;case"value":i=S;break;case"defaultValue":c=S;break;case"children":case"dangerouslySetInnerHTML":if(S!=null)throw Error(r(137,t));break;default:S!==_&&bl(l,t,h,S,a,_)}}yi(l,i,c,f,y,T,n,u);return;case"select":S=i=c=h=null;for(n in e)if(f=e[n],e.hasOwnProperty(n)&&f!=null)switch(n){case"value":break;case"multiple":S=f;default:a.hasOwnProperty(n)||bl(l,t,n,null,a,f)}for(u in a)if(n=a[u],f=e[u],a.hasOwnProperty(u)&&(n!=null||f!=null))switch(u){case"value":h=n;break;case"defaultValue":c=n;break;case"multiple":i=n;default:n!==f&&bl(l,t,u,n,a,f)}t=c,e=i,a=S,h!=null?na(l,!!e,h,!1):!!a!=!!e&&(t!=null?na(l,!!e,t,!0):na(l,!!e,e?[]:"",!1));return;case"textarea":S=h=null;for(c in e)if(u=e[c],e.hasOwnProperty(c)&&u!=null&&!a.hasOwnProperty(c))switch(c){case"value":break;case"children":break;default:bl(l,t,c,null,a,u)}for(i in a)if(u=a[i],n=e[i],a.hasOwnProperty(i)&&(u!=null||n!=null))switch(i){case"value":h=u;break;case"defaultValue":S=u;break;case"children":break;case"dangerouslySetInnerHTML":if(u!=null)throw Error(r(91));break;default:u!==n&&bl(l,t,i,u,a,n)}Zf(l,h,S);return;case"option":for(var q in e)if(h=e[q],e.hasOwnProperty(q)&&h!=null&&!a.hasOwnProperty(q))switch(q){case"selected":l.selected=!1;break;default:bl(l,t,q,null,a,h)}for(f in a)if(h=a[f],S=e[f],a.hasOwnProperty(f)&&h!==S&&(h!=null||S!=null))switch(f){case"selected":l.selected=h&&typeof h!="function"&&typeof h!="symbol";break;default:bl(l,t,f,h,a,S)}return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var V in e)h=e[V],e.hasOwnProperty(V)&&h!=null&&!a.hasOwnProperty(V)&&bl(l,t,V,null,a,h);for(y in a)if(h=a[y],S=e[y],a.hasOwnProperty(y)&&h!==S&&(h!=null||S!=null))switch(y){case"children":case"dangerouslySetInnerHTML":if(h!=null)throw Error(r(137,t));break;default:bl(l,t,y,h,a,S)}return;default:if(hi(t)){for(var Sl in e)h=e[Sl],e.hasOwnProperty(Sl)&&h!==void 0&&!a.hasOwnProperty(Sl)&&ef(l,t,Sl,void 0,a,h);for(T in a)h=a[T],S=e[T],!a.hasOwnProperty(T)||h===S||h===void 0&&S===void 0||ef(l,t,T,h,a,S);return}}for(var d in e)h=e[d],e.hasOwnProperty(d)&&h!=null&&!a.hasOwnProperty(d)&&bl(l,t,d,null,a,h);for(_ in a)h=a[_],S=e[_],!a.hasOwnProperty(_)||h===S||h==null&&S==null||bl(l,t,_,h,a,S)}function $r(l){switch(l){case"css":case"script":case"font":case"img":case"image":case"input":case"link":return!0;default:return!1}}function Nm(){if(typeof performance.getEntriesByType=="function"){for(var l=0,t=0,e=performance.getEntriesByType("resource"),a=0;a<e.length;a++){var u=e[a],n=u.transferSize,i=u.initiatorType,c=u.duration;if(n&&c&&$r(i)){for(i=0,c=u.responseEnd,a+=1;a<e.length;a++){var f=e[a],y=f.startTime;if(y>c)break;var T=f.transferSize,_=f.initiatorType;T&&$r(_)&&(f=f.responseEnd,i+=T*(f<c?1:(c-y)/(f-y)))}if(--a,t+=8*(n+i)/(u.duration/1e3),l++,10<l)break}}if(0<l)return t/l/1e6}return navigator.connection&&(l=navigator.connection.downlink,typeof l=="number")?l:5}var af=null,uf=null;function Jn(l){return l.nodeType===9?l:l.ownerDocument}function kr(l){switch(l){case"http://www.w3.org/2000/svg":return 1;case"http://www.w3.org/1998/Math/MathML":return 2;default:return 0}}function Wr(l,t){if(l===0)switch(t){case"svg":return 1;case"math":return 2;default:return 0}return l===1&&t==="foreignObject"?0:l}function nf(l,t){return l==="textarea"||l==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.children=="bigint"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var cf=null;function Dm(){var l=window.event;return l&&l.type==="popstate"?l===cf?!1:(cf=l,!0):(cf=null,!1)}var Fr=typeof setTimeout=="function"?setTimeout:void 0,jm=typeof clearTimeout=="function"?clearTimeout:void 0,Pr=typeof Promise=="function"?Promise:void 0,Cm=typeof queueMicrotask=="function"?queueMicrotask:typeof Pr<"u"?function(l){return Pr.resolve(null).then(l).catch(Hm)}:Fr;function Hm(l){setTimeout(function(){throw l})}function Ue(l){return l==="head"}function Ir(l,t){var e=t,a=0;do{var u=e.nextSibling;if(l.removeChild(e),u&&u.nodeType===8)if(e=u.data,e==="/$"||e==="/&"){if(a===0){l.removeChild(u),qa(t);return}a--}else if(e==="$"||e==="$?"||e==="$~"||e==="$!"||e==="&")a++;else if(e==="html")Nu(l.ownerDocument.documentElement);else if(e==="head"){e=l.ownerDocument.head,Nu(e);for(var n=e.firstChild;n;){var i=n.nextSibling,c=n.nodeName;n[$a]||c==="SCRIPT"||c==="STYLE"||c==="LINK"&&n.rel.toLowerCase()==="stylesheet"||e.removeChild(n),n=i}}else e==="body"&&Nu(l.ownerDocument.body);e=u}while(e);qa(t)}function ld(l,t){var e=l;l=0;do{var a=e.nextSibling;if(e.nodeType===1?t?(e._stashedDisplay=e.style.display,e.style.display="none"):(e.style.display=e._stashedDisplay||"",e.getAttribute("style")===""&&e.removeAttribute("style")):e.nodeType===3&&(t?(e._stashedText=e.nodeValue,e.nodeValue=""):e.nodeValue=e._stashedText||""),a&&a.nodeType===8)if(e=a.data,e==="/$"){if(l===0)break;l--}else e!=="$"&&e!=="$?"&&e!=="$~"&&e!=="$!"||l++;e=a}while(e)}function ff(l){var t=l.firstChild;for(t&&t.nodeType===10&&(t=t.nextSibling);t;){var e=t;switch(t=t.nextSibling,e.nodeName){case"HTML":case"HEAD":case"BODY":ff(e),di(e);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(e.rel.toLowerCase()==="stylesheet")continue}l.removeChild(e)}}function Rm(l,t,e,a){for(;l.nodeType===1;){var u=e;if(l.nodeName.toLowerCase()!==t.toLowerCase()){if(!a&&(l.nodeName!=="INPUT"||l.type!=="hidden"))break}else if(a){if(!l[$a])switch(t){case"meta":if(!l.hasAttribute("itemprop"))break;return l;case"link":if(n=l.getAttribute("rel"),n==="stylesheet"&&l.hasAttribute("data-precedence"))break;if(n!==u.rel||l.getAttribute("href")!==(u.href==null||u.href===""?null:u.href)||l.getAttribute("crossorigin")!==(u.crossOrigin==null?null:u.crossOrigin)||l.getAttribute("title")!==(u.title==null?null:u.title))break;return l;case"style":if(l.hasAttribute("data-precedence"))break;return l;case"script":if(n=l.getAttribute("src"),(n!==(u.src==null?null:u.src)||l.getAttribute("type")!==(u.type==null?null:u.type)||l.getAttribute("crossorigin")!==(u.crossOrigin==null?null:u.crossOrigin))&&n&&l.hasAttribute("async")&&!l.hasAttribute("itemprop"))break;return l;default:return l}}else if(t==="input"&&l.type==="hidden"){var n=u.name==null?null:""+u.name;if(u.type==="hidden"&&l.getAttribute("name")===n)return l}else return l;if(l=Ct(l.nextSibling),l===null)break}return null}function Bm(l,t,e){if(t==="")return null;for(;l.nodeType!==3;)if((l.nodeType!==1||l.nodeName!=="INPUT"||l.type!=="hidden")&&!e||(l=Ct(l.nextSibling),l===null))return null;return l}function td(l,t){for(;l.nodeType!==8;)if((l.nodeType!==1||l.nodeName!=="INPUT"||l.type!=="hidden")&&!t||(l=Ct(l.nextSibling),l===null))return null;return l}function sf(l){return l.data==="$?"||l.data==="$~"}function of(l){return l.data==="$!"||l.data==="$?"&&l.ownerDocument.readyState!=="loading"}function qm(l,t){var e=l.ownerDocument;if(l.data==="$~")l._reactRetry=t;else if(l.data!=="$?"||e.readyState!=="loading")t();else{var a=function(){t(),e.removeEventListener("DOMContentLoaded",a)};e.addEventListener("DOMContentLoaded",a),l._reactRetry=a}}function Ct(l){for(;l!=null;l=l.nextSibling){var t=l.nodeType;if(t===1||t===3)break;if(t===8){if(t=l.data,t==="$"||t==="$!"||t==="$?"||t==="$~"||t==="&"||t==="F!"||t==="F")break;if(t==="/$"||t==="/&")return null}}return l}var rf=null;function ed(l){l=l.nextSibling;for(var t=0;l;){if(l.nodeType===8){var e=l.data;if(e==="/$"||e==="/&"){if(t===0)return Ct(l.nextSibling);t--}else e!=="$"&&e!=="$!"&&e!=="$?"&&e!=="$~"&&e!=="&"||t++}l=l.nextSibling}return null}function ad(l){l=l.previousSibling;for(var t=0;l;){if(l.nodeType===8){var e=l.data;if(e==="$"||e==="$!"||e==="$?"||e==="$~"||e==="&"){if(t===0)return l;t--}else e!=="/$"&&e!=="/&"||t++}l=l.previousSibling}return null}function ud(l,t,e){switch(t=Jn(e),l){case"html":if(l=t.documentElement,!l)throw Error(r(452));return l;case"head":if(l=t.head,!l)throw Error(r(453));return l;case"body":if(l=t.body,!l)throw Error(r(454));return l;default:throw Error(r(451))}}function Nu(l){for(var t=l.attributes;t.length;)l.removeAttributeNode(t[0]);di(l)}var Ht=new Map,nd=new Set;function $n(l){return typeof l.getRootNode=="function"?l.getRootNode():l.nodeType===9?l:l.ownerDocument}var ce=D.d;D.d={f:Ym,r:Gm,D:Lm,C:Qm,L:Xm,m:Zm,X:Km,S:Vm,M:wm};function Ym(){var l=ce.f(),t=Gn();return l||t}function Gm(l){var t=ea(l);t!==null&&t.tag===5&&t.type==="form"?zo(t):ce.r(l)}var Ha=typeof document>"u"?null:document;function id(l,t,e){var a=Ha;if(a&&typeof t=="string"&&t){var u=_t(t);u='link[rel="'+l+'"][href="'+u+'"]',typeof e=="string"&&(u+='[crossorigin="'+e+'"]'),nd.has(u)||(nd.add(u),l={rel:l,crossOrigin:e,href:t},a.querySelector(u)===null&&(t=a.createElement("link"),lt(t,"link",l),Jl(t),a.head.appendChild(t)))}}function Lm(l){ce.D(l),id("dns-prefetch",l,null)}function Qm(l,t){ce.C(l,t),id("preconnect",l,t)}function Xm(l,t,e){ce.L(l,t,e);var a=Ha;if(a&&l&&t){var u='link[rel="preload"][as="'+_t(t)+'"]';t==="image"&&e&&e.imageSrcSet?(u+='[imagesrcset="'+_t(e.imageSrcSet)+'"]',typeof e.imageSizes=="string"&&(u+='[imagesizes="'+_t(e.imageSizes)+'"]')):u+='[href="'+_t(l)+'"]';var n=u;switch(t){case"style":n=Ra(l);break;case"script":n=Ba(l)}Ht.has(n)||(l=R({rel:"preload",href:t==="image"&&e&&e.imageSrcSet?void 0:l,as:t},e),Ht.set(n,l),a.querySelector(u)!==null||t==="style"&&a.querySelector(Du(n))||t==="script"&&a.querySelector(ju(n))||(t=a.createElement("link"),lt(t,"link",l),Jl(t),a.head.appendChild(t)))}}function Zm(l,t){ce.m(l,t);var e=Ha;if(e&&l){var a=t&&typeof t.as=="string"?t.as:"script",u='link[rel="modulepreload"][as="'+_t(a)+'"][href="'+_t(l)+'"]',n=u;switch(a){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":n=Ba(l)}if(!Ht.has(n)&&(l=R({rel:"modulepreload",href:l},t),Ht.set(n,l),e.querySelector(u)===null)){switch(a){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(e.querySelector(ju(n)))return}a=e.createElement("link"),lt(a,"link",l),Jl(a),e.head.appendChild(a)}}}function Vm(l,t,e){ce.S(l,t,e);var a=Ha;if(a&&l){var u=aa(a).hoistableStyles,n=Ra(l);t=t||"default";var i=u.get(n);if(!i){var c={loading:0,preload:null};if(i=a.querySelector(Du(n)))c.loading=5;else{l=R({rel:"stylesheet",href:l,"data-precedence":t},e),(e=Ht.get(n))&&df(l,e);var f=i=a.createElement("link");Jl(f),lt(f,"link",l),f._p=new Promise(function(y,T){f.onload=y,f.onerror=T}),f.addEventListener("load",function(){c.loading|=1}),f.addEventListener("error",function(){c.loading|=2}),c.loading|=4,kn(i,t,a)}i={type:"stylesheet",instance:i,count:1,state:c},u.set(n,i)}}}function Km(l,t){ce.X(l,t);var e=Ha;if(e&&l){var a=aa(e).hoistableScripts,u=Ba(l),n=a.get(u);n||(n=e.querySelector(ju(u)),n||(l=R({src:l,async:!0},t),(t=Ht.get(u))&&mf(l,t),n=e.createElement("script"),Jl(n),lt(n,"link",l),e.head.appendChild(n)),n={type:"script",instance:n,count:1,state:null},a.set(u,n))}}function wm(l,t){ce.M(l,t);var e=Ha;if(e&&l){var a=aa(e).hoistableScripts,u=Ba(l),n=a.get(u);n||(n=e.querySelector(ju(u)),n||(l=R({src:l,async:!0,type:"module"},t),(t=Ht.get(u))&&mf(l,t),n=e.createElement("script"),Jl(n),lt(n,"link",l),e.head.appendChild(n)),n={type:"script",instance:n,count:1,state:null},a.set(u,n))}}function cd(l,t,e,a){var u=(u=J.current)?$n(u):null;if(!u)throw Error(r(446));switch(l){case"meta":case"title":return null;case"style":return typeof e.precedence=="string"&&typeof e.href=="string"?(t=Ra(e.href),e=aa(u).hoistableStyles,a=e.get(t),a||(a={type:"style",instance:null,count:0,state:null},e.set(t,a)),a):{type:"void",instance:null,count:0,state:null};case"link":if(e.rel==="stylesheet"&&typeof e.href=="string"&&typeof e.precedence=="string"){l=Ra(e.href);var n=aa(u).hoistableStyles,i=n.get(l);if(i||(u=u.ownerDocument||u,i={type:"stylesheet",instance:null,count:0,state:{loading:0,preload:null}},n.set(l,i),(n=u.querySelector(Du(l)))&&!n._p&&(i.instance=n,i.state.loading=5),Ht.has(l)||(e={rel:"preload",as:"style",href:e.href,crossOrigin:e.crossOrigin,integrity:e.integrity,media:e.media,hrefLang:e.hrefLang,referrerPolicy:e.referrerPolicy},Ht.set(l,e),n||Jm(u,l,e,i.state))),t&&a===null)throw Error(r(528,""));return i}if(t&&a!==null)throw Error(r(529,""));return null;case"script":return t=e.async,e=e.src,typeof e=="string"&&t&&typeof t!="function"&&typeof t!="symbol"?(t=Ba(e),e=aa(u).hoistableScripts,a=e.get(t),a||(a={type:"script",instance:null,count:0,state:null},e.set(t,a)),a):{type:"void",instance:null,count:0,state:null};default:throw Error(r(444,l))}}function Ra(l){return'href="'+_t(l)+'"'}function Du(l){return'link[rel="stylesheet"]['+l+"]"}function fd(l){return R({},l,{"data-precedence":l.precedence,precedence:null})}function Jm(l,t,e,a){l.querySelector('link[rel="preload"][as="style"]['+t+"]")?a.loading=1:(t=l.createElement("link"),a.preload=t,t.addEventListener("load",function(){return a.loading|=1}),t.addEventListener("error",function(){return a.loading|=2}),lt(t,"link",e),Jl(t),l.head.appendChild(t))}function Ba(l){return'[src="'+_t(l)+'"]'}function ju(l){return"script[async]"+l}function sd(l,t,e){if(t.count++,t.instance===null)switch(t.type){case"style":var a=l.querySelector('style[data-href~="'+_t(e.href)+'"]');if(a)return t.instance=a,Jl(a),a;var u=R({},e,{"data-href":e.href,"data-precedence":e.precedence,href:null,precedence:null});return a=(l.ownerDocument||l).createElement("style"),Jl(a),lt(a,"style",u),kn(a,e.precedence,l),t.instance=a;case"stylesheet":u=Ra(e.href);var n=l.querySelector(Du(u));if(n)return t.state.loading|=4,t.instance=n,Jl(n),n;a=fd(e),(u=Ht.get(u))&&df(a,u),n=(l.ownerDocument||l).createElement("link"),Jl(n);var i=n;return i._p=new Promise(function(c,f){i.onload=c,i.onerror=f}),lt(n,"link",a),t.state.loading|=4,kn(n,e.precedence,l),t.instance=n;case"script":return n=Ba(e.src),(u=l.querySelector(ju(n)))?(t.instance=u,Jl(u),u):(a=e,(u=Ht.get(n))&&(a=R({},e),mf(a,u)),l=l.ownerDocument||l,u=l.createElement("script"),Jl(u),lt(u,"link",a),l.head.appendChild(u),t.instance=u);case"void":return null;default:throw Error(r(443,t.type))}else t.type==="stylesheet"&&(t.state.loading&4)===0&&(a=t.instance,t.state.loading|=4,kn(a,e.precedence,l));return t.instance}function kn(l,t,e){for(var a=e.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),u=a.length?a[a.length-1]:null,n=u,i=0;i<a.length;i++){var c=a[i];if(c.dataset.precedence===t)n=c;else if(n!==u)break}n?n.parentNode.insertBefore(l,n.nextSibling):(t=e.nodeType===9?e.head:e,t.insertBefore(l,t.firstChild))}function df(l,t){l.crossOrigin==null&&(l.crossOrigin=t.crossOrigin),l.referrerPolicy==null&&(l.referrerPolicy=t.referrerPolicy),l.title==null&&(l.title=t.title)}function mf(l,t){l.crossOrigin==null&&(l.crossOrigin=t.crossOrigin),l.referrerPolicy==null&&(l.referrerPolicy=t.referrerPolicy),l.integrity==null&&(l.integrity=t.integrity)}var Wn=null;function od(l,t,e){if(Wn===null){var a=new Map,u=Wn=new Map;u.set(e,a)}else u=Wn,a=u.get(e),a||(a=new Map,u.set(e,a));if(a.has(l))return a;for(a.set(l,null),e=e.getElementsByTagName(l),u=0;u<e.length;u++){var n=e[u];if(!(n[$a]||n[Wl]||l==="link"&&n.getAttribute("rel")==="stylesheet")&&n.namespaceURI!=="http://www.w3.org/2000/svg"){var i=n.getAttribute(t)||"";i=l+i;var c=a.get(i);c?c.push(n):a.set(i,[n])}}return a}function rd(l,t,e){l=l.ownerDocument||l,l.head.insertBefore(e,t==="title"?l.querySelector("head > title"):null)}function $m(l,t,e){if(e===1||t.itemProp!=null)return!1;switch(l){case"meta":case"title":return!0;case"style":if(typeof t.precedence!="string"||typeof t.href!="string"||t.href==="")break;return!0;case"link":if(typeof t.rel!="string"||typeof t.href!="string"||t.href===""||t.onLoad||t.onError)break;switch(t.rel){case"stylesheet":return l=t.disabled,typeof t.precedence=="string"&&l==null;default:return!0}case"script":if(t.async&&typeof t.async!="function"&&typeof t.async!="symbol"&&!t.onLoad&&!t.onError&&t.src&&typeof t.src=="string")return!0}return!1}function dd(l){return!(l.type==="stylesheet"&&(l.state.loading&3)===0)}function km(l,t,e,a){if(e.type==="stylesheet"&&(typeof a.media!="string"||matchMedia(a.media).matches!==!1)&&(e.state.loading&4)===0){if(e.instance===null){var u=Ra(a.href),n=t.querySelector(Du(u));if(n){t=n._p,t!==null&&typeof t=="object"&&typeof t.then=="function"&&(l.count++,l=Fn.bind(l),t.then(l,l)),e.state.loading|=4,e.instance=n,Jl(n);return}n=t.ownerDocument||t,a=fd(a),(u=Ht.get(u))&&df(a,u),n=n.createElement("link"),Jl(n);var i=n;i._p=new Promise(function(c,f){i.onload=c,i.onerror=f}),lt(n,"link",a),e.instance=n}l.stylesheets===null&&(l.stylesheets=new Map),l.stylesheets.set(e,t),(t=e.state.preload)&&(e.state.loading&3)===0&&(l.count++,e=Fn.bind(l),t.addEventListener("load",e),t.addEventListener("error",e))}}var yf=0;function Wm(l,t){return l.stylesheets&&l.count===0&&In(l,l.stylesheets),0<l.count||0<l.imgCount?function(e){var a=setTimeout(function(){if(l.stylesheets&&In(l,l.stylesheets),l.unsuspend){var n=l.unsuspend;l.unsuspend=null,n()}},6e4+t);0<l.imgBytes&&yf===0&&(yf=62500*Nm());var u=setTimeout(function(){if(l.waitingForImages=!1,l.count===0&&(l.stylesheets&&In(l,l.stylesheets),l.unsuspend)){var n=l.unsuspend;l.unsuspend=null,n()}},(l.imgBytes>yf?50:800)+t);return l.unsuspend=e,function(){l.unsuspend=null,clearTimeout(a),clearTimeout(u)}}:null}function Fn(){if(this.count--,this.count===0&&(this.imgCount===0||!this.waitingForImages)){if(this.stylesheets)In(this,this.stylesheets);else if(this.unsuspend){var l=this.unsuspend;this.unsuspend=null,l()}}}var Pn=null;function In(l,t){l.stylesheets=null,l.unsuspend!==null&&(l.count++,Pn=new Map,t.forEach(Fm,l),Pn=null,Fn.call(l))}function Fm(l,t){if(!(t.state.loading&4)){var e=Pn.get(l);if(e)var a=e.get(null);else{e=new Map,Pn.set(l,e);for(var u=l.querySelectorAll("link[data-precedence],style[data-precedence]"),n=0;n<u.length;n++){var i=u[n];(i.nodeName==="LINK"||i.getAttribute("media")!=="not all")&&(e.set(i.dataset.precedence,i),a=i)}a&&e.set(null,a)}u=t.instance,i=u.getAttribute("data-precedence"),n=e.get(i)||a,n===a&&e.set(null,u),e.set(i,u),this.count++,a=Fn.bind(this),u.addEventListener("load",a),u.addEventListener("error",a),n?n.parentNode.insertBefore(u,n.nextSibling):(l=l.nodeType===9?l.head:l,l.insertBefore(u,l.firstChild)),t.state.loading|=4}}var Cu={$$typeof:Al,Provider:null,Consumer:null,_currentValue:X,_currentValue2:X,_threadCount:0};function Pm(l,t,e,a,u,n,i,c,f){this.tag=1,this.containerInfo=l,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=fi(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=fi(0),this.hiddenUpdates=fi(null),this.identifierPrefix=a,this.onUncaughtError=u,this.onCaughtError=n,this.onRecoverableError=i,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=f,this.incompleteTransitions=new Map}function md(l,t,e,a,u,n,i,c,f,y,T,_){return l=new Pm(l,t,e,i,f,y,T,_,c),t=1,n===!0&&(t|=24),n=bt(3,null,null,t),l.current=n,n.stateNode=l,t=wi(),t.refCount++,l.pooledCache=t,t.refCount++,n.memoizedState={element:a,isDehydrated:e,cache:t},Wi(n),l}function yd(l){return l?(l=ma,l):ma}function vd(l,t,e,a,u,n){u=yd(u),a.context===null?a.context=u:a.pendingContext=u,a=be(t),a.payload={element:e},n=n===void 0?null:n,n!==null&&(a.callback=n),e=Se(l,a,t),e!==null&&(dt(e,l,t),ru(e,l,t))}function hd(l,t){if(l=l.memoizedState,l!==null&&l.dehydrated!==null){var e=l.retryLane;l.retryLane=e!==0&&e<t?e:t}}function vf(l,t){hd(l,t),(l=l.alternate)&&hd(l,t)}function gd(l){if(l.tag===13||l.tag===31){var t=Le(l,67108864);t!==null&&dt(t,l,67108864),vf(l,67108864)}}function bd(l){if(l.tag===13||l.tag===31){var t=Tt();t=si(t);var e=Le(l,t);e!==null&&dt(e,l,t),vf(l,t)}}var li=!0;function Im(l,t,e,a){var u=p.T;p.T=null;var n=D.p;try{D.p=2,hf(l,t,e,a)}finally{D.p=n,p.T=u}}function ly(l,t,e,a){var u=p.T;p.T=null;var n=D.p;try{D.p=8,hf(l,t,e,a)}finally{D.p=n,p.T=u}}function hf(l,t,e,a){if(li){var u=gf(a);if(u===null)tf(l,t,a,ti,e),pd(l,a);else if(ey(u,l,t,e,a))a.stopPropagation();else if(pd(l,a),t&4&&-1<ty.indexOf(l)){for(;u!==null;){var n=ea(u);if(n!==null)switch(n.tag){case 3:if(n=n.stateNode,n.current.memoizedState.isDehydrated){var i=Re(n.pendingLanes);if(i!==0){var c=n;for(c.pendingLanes|=2,c.entangledLanes|=2;i;){var f=1<<31-ht(i);c.entanglements[1]|=f,i&=~f}Zt(n),(rl&6)===0&&(qn=al()+500,Ou(0))}}break;case 31:case 13:c=Le(n,2),c!==null&&dt(c,n,2),Gn(),vf(n,2)}if(n=gf(a),n===null&&tf(l,t,a,ti,e),n===u)break;u=n}u!==null&&a.stopPropagation()}else tf(l,t,a,null,e)}}function gf(l){return l=bi(l),bf(l)}var ti=null;function bf(l){if(ti=null,l=ta(l),l!==null){var t=M(l);if(t===null)l=null;else{var e=t.tag;if(e===13){if(l=B(t),l!==null)return l;l=null}else if(e===31){if(l=C(t),l!==null)return l;l=null}else if(e===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;l=null}else t!==l&&(l=null)}}return ti=l,null}function Sd(l){switch(l){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 8;case"message":switch(nt()){case wl:return 2;case yt:return 8;case xl:case Va:return 32;case Zu:return 268435456;default:return 32}default:return 32}}var Sf=!1,Ne=null,De=null,je=null,Hu=new Map,Ru=new Map,Ce=[],ty="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");function pd(l,t){switch(l){case"focusin":case"focusout":Ne=null;break;case"dragenter":case"dragleave":De=null;break;case"mouseover":case"mouseout":je=null;break;case"pointerover":case"pointerout":Hu.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Ru.delete(t.pointerId)}}function Bu(l,t,e,a,u,n){return l===null||l.nativeEvent!==n?(l={blockedOn:t,domEventName:e,eventSystemFlags:a,nativeEvent:n,targetContainers:[u]},t!==null&&(t=ea(t),t!==null&&gd(t)),l):(l.eventSystemFlags|=a,t=l.targetContainers,u!==null&&t.indexOf(u)===-1&&t.push(u),l)}function ey(l,t,e,a,u){switch(t){case"focusin":return Ne=Bu(Ne,l,t,e,a,u),!0;case"dragenter":return De=Bu(De,l,t,e,a,u),!0;case"mouseover":return je=Bu(je,l,t,e,a,u),!0;case"pointerover":var n=u.pointerId;return Hu.set(n,Bu(Hu.get(n)||null,l,t,e,a,u)),!0;case"gotpointercapture":return n=u.pointerId,Ru.set(n,Bu(Ru.get(n)||null,l,t,e,a,u)),!0}return!1}function Ed(l){var t=ta(l.target);if(t!==null){var e=M(t);if(e!==null){if(t=e.tag,t===13){if(t=B(e),t!==null){l.blockedOn=t,Hf(l.priority,function(){bd(e)});return}}else if(t===31){if(t=C(e),t!==null){l.blockedOn=t,Hf(l.priority,function(){bd(e)});return}}else if(t===3&&e.stateNode.current.memoizedState.isDehydrated){l.blockedOn=e.tag===3?e.stateNode.containerInfo:null;return}}}l.blockedOn=null}function ei(l){if(l.blockedOn!==null)return!1;for(var t=l.targetContainers;0<t.length;){var e=gf(l.nativeEvent);if(e===null){e=l.nativeEvent;var a=new e.constructor(e.type,e);gi=a,e.target.dispatchEvent(a),gi=null}else return t=ea(e),t!==null&&gd(t),l.blockedOn=e,!1;t.shift()}return!0}function zd(l,t,e){ei(l)&&e.delete(t)}function ay(){Sf=!1,Ne!==null&&ei(Ne)&&(Ne=null),De!==null&&ei(De)&&(De=null),je!==null&&ei(je)&&(je=null),Hu.forEach(zd),Ru.forEach(zd)}function ai(l,t){l.blockedOn===t&&(l.blockedOn=null,Sf||(Sf=!0,b.unstable_scheduleCallback(b.unstable_NormalPriority,ay)))}var ui=null;function Td(l){ui!==l&&(ui=l,b.unstable_scheduleCallback(b.unstable_NormalPriority,function(){ui===l&&(ui=null);for(var t=0;t<l.length;t+=3){var e=l[t],a=l[t+1],u=l[t+2];if(typeof a!="function"){if(bf(a||e)===null)continue;break}var n=ea(e);n!==null&&(l.splice(t,3),t-=3,hc(n,{pending:!0,data:u,method:e.method,action:a},a,u))}}))}function qa(l){function t(f){return ai(f,l)}Ne!==null&&ai(Ne,l),De!==null&&ai(De,l),je!==null&&ai(je,l),Hu.forEach(t),Ru.forEach(t);for(var e=0;e<Ce.length;e++){var a=Ce[e];a.blockedOn===l&&(a.blockedOn=null)}for(;0<Ce.length&&(e=Ce[0],e.blockedOn===null);)Ed(e),e.blockedOn===null&&Ce.shift();if(e=(l.ownerDocument||l).$$reactFormReplay,e!=null)for(a=0;a<e.length;a+=3){var u=e[a],n=e[a+1],i=u[it]||null;if(typeof n=="function")i||Td(e);else if(i){var c=null;if(n&&n.hasAttribute("formAction")){if(u=n,i=n[it]||null)c=i.formAction;else if(bf(u)!==null)continue}else c=i.action;typeof c=="function"?e[a+1]=c:(e.splice(a,3),a-=3),Td(e)}}}function Ad(){function l(n){n.canIntercept&&n.info==="react-transition"&&n.intercept({handler:function(){return new Promise(function(i){return u=i})},focusReset:"manual",scroll:"manual"})}function t(){u!==null&&(u(),u=null),a||setTimeout(e,20)}function e(){if(!a&&!navigation.transition){var n=navigation.currentEntry;n&&n.url!=null&&navigation.navigate(n.url,{state:n.getState(),info:"react-transition",history:"replace"})}}if(typeof navigation=="object"){var a=!1,u=null;return navigation.addEventListener("navigate",l),navigation.addEventListener("navigatesuccess",t),navigation.addEventListener("navigateerror",t),setTimeout(e,100),function(){a=!0,navigation.removeEventListener("navigate",l),navigation.removeEventListener("navigatesuccess",t),navigation.removeEventListener("navigateerror",t),u!==null&&(u(),u=null)}}}function pf(l){this._internalRoot=l}ni.prototype.render=pf.prototype.render=function(l){var t=this._internalRoot;if(t===null)throw Error(r(409));var e=t.current,a=Tt();vd(e,a,l,t,null,null)},ni.prototype.unmount=pf.prototype.unmount=function(){var l=this._internalRoot;if(l!==null){this._internalRoot=null;var t=l.containerInfo;vd(l.current,2,null,l,null,null),Gn(),t[la]=null}};function ni(l){this._internalRoot=l}ni.prototype.unstable_scheduleHydration=function(l){if(l){var t=Cf();l={blockedOn:null,target:l,priority:t};for(var e=0;e<Ce.length&&t!==0&&t<Ce[e].priority;e++);Ce.splice(e,0,l),e===0&&Ed(l)}};var xd=v.version;if(xd!=="19.2.0")throw Error(r(527,xd,"19.2.0"));D.findDOMNode=function(l){var t=l._reactInternals;if(t===void 0)throw typeof l.render=="function"?Error(r(188)):(l=Object.keys(l).join(","),Error(r(268,l)));return l=g(t),l=l!==null?w(l):null,l=l===null?null:l.stateNode,l};var uy={bundleType:0,version:"19.2.0",rendererPackageName:"react-dom",currentDispatcherRef:p,reconcilerVersion:"19.2.0"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ii=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ii.isDisabled&&ii.supportsFiber)try{Ka=ii.inject(uy),vt=ii}catch{}}return Yu.createRoot=function(l,t){if(!U(l))throw Error(r(299));var e=!1,a="",u=jo,n=Co,i=Ho;return t!=null&&(t.unstable_strictMode===!0&&(e=!0),t.identifierPrefix!==void 0&&(a=t.identifierPrefix),t.onUncaughtError!==void 0&&(u=t.onUncaughtError),t.onCaughtError!==void 0&&(n=t.onCaughtError),t.onRecoverableError!==void 0&&(i=t.onRecoverableError)),t=md(l,1,!1,null,null,e,a,null,u,n,i,Ad),l[la]=t.current,lf(l),new pf(t)},Yu.hydrateRoot=function(l,t,e){if(!U(l))throw Error(r(299));var a=!1,u="",n=jo,i=Co,c=Ho,f=null;return e!=null&&(e.unstable_strictMode===!0&&(a=!0),e.identifierPrefix!==void 0&&(u=e.identifierPrefix),e.onUncaughtError!==void 0&&(n=e.onUncaughtError),e.onCaughtError!==void 0&&(i=e.onCaughtError),e.onRecoverableError!==void 0&&(c=e.onRecoverableError),e.formState!==void 0&&(f=e.formState)),t=md(l,1,!0,t,e??null,a,u,f,n,i,c,Ad),t.context=yd(null),e=t.current,a=Tt(),a=si(a),u=be(a),u.callback=null,Se(e,u,a),e=a,t.current.lanes=e,Ja(t,e),Zt(t),l[la]=t.current,lf(l),new ni(t)},Yu.version="19.2.0",Yu}var Rd;function yy(){if(Rd)return Tf.exports;Rd=1;function b(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(b)}catch(v){console.error(v)}}return b(),Tf.exports=my(),Tf.exports}var vy=yy();const hy=b=>{const v=new Map;v.set("web",{name:"web"});const O=b.CapacitorPlatforms||{currentPlatform:{name:"web"},platforms:v},r=(M,B)=>{O.platforms.set(M,B)},U=M=>{O.platforms.has(M)&&(O.currentPlatform=O.platforms.get(M))};return O.addPlatform=r,O.setPlatform=U,O},gy=b=>b.CapacitorPlatforms=hy(b),Gd=gy(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});Gd.addPlatform;Gd.setPlatform;var Ya;(function(b){b.Unimplemented="UNIMPLEMENTED",b.Unavailable="UNAVAILABLE"})(Ya||(Ya={}));class Of extends Error{constructor(v,O,r){super(v),this.message=v,this.code=O,this.data=r}}const by=b=>{var v,O;return b?.androidBridge?"android":!((O=(v=b?.webkit)===null||v===void 0?void 0:v.messageHandlers)===null||O===void 0)&&O.bridge?"ios":"web"},Sy=b=>{var v,O,r,U,M;const B=b.CapacitorCustomPlatform||null,C=b.Capacitor||{},j=C.Plugins=C.Plugins||{},g=b.CapacitorPlatforms,w=()=>B!==null?B.name:by(b),R=((v=g?.currentPlatform)===null||v===void 0?void 0:v.getPlatform)||w,Z=()=>R()!=="web",Tl=((O=g?.currentPlatform)===null||O===void 0?void 0:O.isNativePlatform)||Z,vl=G=>{const el=jl.get(G);return!!(el?.platforms.has(R())||P(G))},fl=((r=g?.currentPlatform)===null||r===void 0?void 0:r.isPluginAvailable)||vl,pl=G=>{var el;return(el=C.PluginHeaders)===null||el===void 0?void 0:el.find(ql=>ql.name===G)},P=((U=g?.currentPlatform)===null||U===void 0?void 0:U.getPluginHeader)||pl,Ml=G=>b.console.error(G),Al=(G,el,ql)=>Promise.reject(`${ql} does not have an implementation of "${el}".`),jl=new Map,ut=(G,el={})=>{const ql=jl.get(G);if(ql)return console.warn(`Capacitor plugin "${G}" already registered. Cannot register plugins twice.`),ql.proxy;const tt=R(),Ul=P(G);let zl;const mt=async()=>(!zl&&tt in el?zl=typeof el[tt]=="function"?zl=await el[tt]():zl=el[tt]:B!==null&&!zl&&"web"in el&&(zl=typeof el.web=="function"?zl=await el.web():zl=el.web),zl),Yl=(K,s)=>{var E,N;if(Ul){const H=Ul?.methods.find(L=>s===L.name);if(H)return H.rtype==="promise"?L=>C.nativePromise(G,s.toString(),L):(L,J)=>C.nativeCallback(G,s.toString(),L,J);if(K)return(E=K[s])===null||E===void 0?void 0:E.bind(K)}else{if(K)return(N=K[s])===null||N===void 0?void 0:N.bind(K);throw new Of(`"${G}" plugin is not implemented on ${tt}`,Ya.Unimplemented)}},Kl=K=>{let s;const E=(...N)=>{const H=mt().then(L=>{const J=Yl(L,K);if(J){const I=J(...N);return s=I?.remove,I}else throw new Of(`"${G}.${K}()" is not implemented on ${tt}`,Ya.Unimplemented)});return K==="addListener"&&(H.remove=async()=>s()),H};return E.toString=()=>`${K.toString()}() { [capacitor code] }`,Object.defineProperty(E,"name",{value:K,writable:!1,configurable:!1}),E},p=Kl("addListener"),D=Kl("removeListener"),X=(K,s)=>{const E=p({eventName:K},s),N=async()=>{const L=await E;D({eventName:K,callbackId:L},s)},H=new Promise(L=>E.then(()=>L({remove:N})));return H.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await N()},H},il=new Proxy({},{get(K,s){switch(s){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return Ul?X:p;case"removeListener":return D;default:return Kl(s)}}});return j[G]=il,jl.set(G,{name:G,proxy:il,platforms:new Set([...Object.keys(el),...Ul?[tt]:[]])}),il},Vl=((M=g?.currentPlatform)===null||M===void 0?void 0:M.registerPlugin)||ut;return C.convertFileSrc||(C.convertFileSrc=G=>G),C.getPlatform=R,C.handleError=Ml,C.isNativePlatform=Tl,C.isPluginAvailable=fl,C.pluginMethodNoop=Al,C.registerPlugin=Vl,C.Exception=Of,C.DEBUG=!!C.DEBUG,C.isLoggingEnabled=!!C.isLoggingEnabled,C.platform=C.getPlatform(),C.isNative=C.isNativePlatform(),C},py=b=>b.Capacitor=Sy(b),fe=py(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{}),Qu=fe.registerPlugin;fe.Plugins;class Ld{constructor(v){this.listeners={},this.retainedEventArguments={},this.windowListeners={},v&&(console.warn(`Capacitor WebPlugin "${v.name}" config object was deprecated in v3 and will be removed in v4.`),this.config=v)}addListener(v,O){let r=!1;this.listeners[v]||(this.listeners[v]=[],r=!0),this.listeners[v].push(O);const M=this.windowListeners[v];M&&!M.registered&&this.addWindowListener(M),r&&this.sendRetainedArgumentsForEvent(v);const B=async()=>this.removeListener(v,O);return Promise.resolve({remove:B})}async removeAllListeners(){this.listeners={};for(const v in this.windowListeners)this.removeWindowListener(this.windowListeners[v]);this.windowListeners={}}notifyListeners(v,O,r){const U=this.listeners[v];if(!U){if(r){let M=this.retainedEventArguments[v];M||(M=[]),M.push(O),this.retainedEventArguments[v]=M}return}U.forEach(M=>M(O))}hasListeners(v){return!!this.listeners[v].length}registerWindowListener(v,O){this.windowListeners[O]={registered:!1,windowEventName:v,pluginEventName:O,handler:r=>{this.notifyListeners(O,r)}}}unimplemented(v="not implemented"){return new fe.Exception(v,Ya.Unimplemented)}unavailable(v="not available"){return new fe.Exception(v,Ya.Unavailable)}async removeListener(v,O){const r=this.listeners[v];if(!r)return;const U=r.indexOf(O);this.listeners[v].splice(U,1),this.listeners[v].length||this.removeWindowListener(this.windowListeners[v])}addWindowListener(v){window.addEventListener(v.windowEventName,v.handler),v.registered=!0}removeWindowListener(v){v&&(window.removeEventListener(v.windowEventName,v.handler),v.registered=!1)}sendRetainedArgumentsForEvent(v){const O=this.retainedEventArguments[v];O&&(delete this.retainedEventArguments[v],O.forEach(r=>{this.notifyListeners(v,r)}))}}const Bd=b=>encodeURIComponent(b).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),qd=b=>b.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class Ey extends Ld{async getCookies(){const v=document.cookie,O={};return v.split(";").forEach(r=>{if(r.length<=0)return;let[U,M]=r.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");U=qd(U).trim(),M=qd(M).trim(),O[U]=M}),O}async setCookie(v){try{const O=Bd(v.key),r=Bd(v.value),U=`; expires=${(v.expires||"").replace("expires=","")}`,M=(v.path||"/").replace("path=",""),B=v.url!=null&&v.url.length>0?`domain=${v.url}`:"";document.cookie=`${O}=${r||""}${U}; path=${M}; ${B};`}catch(O){return Promise.reject(O)}}async deleteCookie(v){try{document.cookie=`${v.key}=; Max-Age=0`}catch(O){return Promise.reject(O)}}async clearCookies(){try{const v=document.cookie.split(";")||[];for(const O of v)document.cookie=O.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(v){return Promise.reject(v)}}async clearAllCookies(){try{await this.clearCookies()}catch(v){return Promise.reject(v)}}}Qu("CapacitorCookies",{web:()=>new Ey});const zy=async b=>new Promise((v,O)=>{const r=new FileReader;r.onload=()=>{const U=r.result;v(U.indexOf(",")>=0?U.split(",")[1]:U)},r.onerror=U=>O(U),r.readAsDataURL(b)}),Ty=(b={})=>{const v=Object.keys(b);return Object.keys(b).map(U=>U.toLocaleLowerCase()).reduce((U,M,B)=>(U[M]=b[v[B]],U),{})},Ay=(b,v=!0)=>b?Object.entries(b).reduce((r,U)=>{const[M,B]=U;let C,j;return Array.isArray(B)?(j="",B.forEach(g=>{C=v?encodeURIComponent(g):g,j+=`${M}=${C}&`}),j.slice(0,-1)):(C=v?encodeURIComponent(B):B,j=`${M}=${C}`),`${r}&${j}`},"").substr(1):null,xy=(b,v={})=>{const O=Object.assign({method:b.method||"GET",headers:b.headers},v),U=Ty(b.headers)["content-type"]||"";if(typeof b.data=="string")O.body=b.data;else if(U.includes("application/x-www-form-urlencoded")){const M=new URLSearchParams;for(const[B,C]of Object.entries(b.data||{}))M.set(B,C);O.body=M.toString()}else if(U.includes("multipart/form-data")||b.data instanceof FormData){const M=new FormData;if(b.data instanceof FormData)b.data.forEach((C,j)=>{M.append(j,C)});else for(const C of Object.keys(b.data))M.append(C,b.data[C]);O.body=M;const B=new Headers(O.headers);B.delete("content-type"),O.headers=B}else(U.includes("application/json")||typeof b.data=="object")&&(O.body=JSON.stringify(b.data));return O};class _y extends Ld{async request(v){const O=xy(v,v.webFetchExtra),r=Ay(v.params,v.shouldEncodeUrlParams),U=r?`${v.url}?${r}`:v.url,M=await fetch(U,O),B=M.headers.get("content-type")||"";let{responseType:C="text"}=M.ok?v:{};B.includes("application/json")&&(C="json");let j,g;switch(C){case"arraybuffer":case"blob":g=await M.blob(),j=await zy(g);break;case"json":j=await M.json();break;case"document":case"text":default:j=await M.text()}const w={};return M.headers.forEach((R,Z)=>{w[Z]=R}),{data:j,headers:w,status:M.status,url:M.url}}async get(v){return this.request(Object.assign(Object.assign({},v),{method:"GET"}))}async post(v){return this.request(Object.assign(Object.assign({},v),{method:"POST"}))}async put(v){return this.request(Object.assign(Object.assign({},v),{method:"PUT"}))}async patch(v){return this.request(Object.assign(Object.assign({},v),{method:"PATCH"}))}async delete(v){return this.request(Object.assign(Object.assign({},v),{method:"DELETE"}))}}Qu("CapacitorHttp",{web:()=>new _y});const Oy="modulepreload",My=function(b){return"/"+b},Yd={},Qd=function(v,O,r){let U=Promise.resolve();if(O&&O.length>0){let j=function(g){return Promise.all(g.map(w=>Promise.resolve(w).then(R=>({status:"fulfilled",value:R}),R=>({status:"rejected",reason:R}))))};document.getElementsByTagName("link");const B=document.querySelector("meta[property=csp-nonce]"),C=B?.nonce||B?.getAttribute("nonce");U=j(O.map(g=>{if(g=My(g),g in Yd)return;Yd[g]=!0;const w=g.endsWith(".css"),R=w?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${g}"]${R}`))return;const Z=document.createElement("link");if(Z.rel=w?"stylesheet":Oy,w||(Z.as="script"),Z.crossOrigin="",Z.href=g,C&&Z.setAttribute("nonce",C),document.head.appendChild(Z),w)return new Promise((Tl,vl)=>{Z.addEventListener("load",Tl),Z.addEventListener("error",()=>vl(new Error(`Unable to preload CSS for ${g}`)))})}))}function M(B){const C=new Event("vite:preloadError",{cancelable:!0});if(C.payload=B,window.dispatchEvent(C),!C.defaultPrevented)throw B}return U.then(B=>{for(const C of B||[])C.status==="rejected"&&M(C.reason);return v().catch(M)})};Qu("Browser",{web:()=>Qd(()=>import("./web-Bppy2vSi.js"),[]).then(b=>new b.BrowserWeb)});const ci=Qu("App",{web:()=>Qd(()=>import("./web-Bf-rnTBP.js"),[]).then(b=>new b.AppWeb)}),Gu=Qu("TVPlayer"),Lu=b=>{if(!b)return"";let v=b.replace(/\./g," ").replace(/_/g," ").replace(/\[.*?\]/g,"").replace(/\(.*?\)/g,"").trim();const O=v.match(/\b(19\d{2}|20\d{2})\b/);if(O){const B=v.indexOf(O[0]);v=v.substring(0,B)}const r=["1080p","720p","2160p","4k","WEB-DL","WEBRip","BluRay","HDR","H.264","x264","HEVC","AAC","AC3","DTS","HDTV","rus","eng","torrent","stream","dub","sub"];let U=v.length;const M=v.toLowerCase();return r.forEach(B=>{const C=M.indexOf(B.toLowerCase());C!==-1&&C<U&&(U=C)}),v.substring(0,U).replace(/[^\w\s\u0400-\u04FF]/g,"").replace(/\s+/g," ").trim()},Uy=b=>{if(!b)return"";const v=["B","KB","MB","GB","TB"];let O=0,r=b;for(;r>=1024&&O<v.length-1;)r/=1024,O++;return`${r.toFixed(1)} ${v[O]}`},Ny=b=>{if(!b||b<1024)return"";const v=b/1024;return v<1024?`${v.toFixed(0)} KB/s`:`${(v/1024).toFixed(1)} MB/s`},Dy=({name:b,onClick:v,progress:O,peers:r,isReady:U,size:M,downloadSpeed:B})=>{const[C,j]=yl.useState(null),g=Lu(b),w=R=>{let Z=0;for(let fl=0;fl<R.length;fl++)Z=R.charCodeAt(fl)+((Z<<5)-Z);const Tl=Math.abs(Z%360),vl=Math.abs(Z*13%360);return`linear-gradient(135deg, hsl(${Tl}, 70%, 20%), hsl(${vl}, 80%, 15%))`};return yl.useEffect(()=>{if(!g)return;const R=`poster_v3_${g}`,Z=localStorage.getItem(R);if(Z){j(Z);return}(async()=>{try{const vl="c3bec60e67fabf42dd2202281dcbc9a7";let fl=null;try{const pl=`https://api.themoviedb.org/3/search/multi?api_key=${vl}&query=${encodeURIComponent(g)}&language=ru-RU`,P=`https://api.allorigins.win/raw?url=${encodeURIComponent(pl)}`;console.log("[Poster] Client Search:",P);const Ml=await fetch(P);Ml.ok&&(fl=(await Ml.json()).results?.find(jl=>jl.poster_path))}catch(pl){console.warn("[Poster] Client Search Failed:",pl)}if(!fl){let pl="";fe.isNativePlatform()&&(pl=localStorage.getItem("serverUrl")||"http://192.168.1.70:3000"),pl=pl.replace(/\/$/,"");const P=`${pl}/api/tmdb/search?query=${encodeURIComponent(g)}`;console.log("[Poster] Fetching Meta (Server Fallback):",P);const Ml=await fetch(P);Ml.ok&&(fl=(await Ml.json()).results?.find(jl=>jl.poster_path))}if(fl){const pl=`https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w500${fl.poster_path}&output=webp`;localStorage.setItem(R,pl),j(pl)}}catch(vl){console.warn("Poster Fetch Fail:",vl)}})()},[g]),x.jsxs("button",{onClick:v,className:`
          relative group aspect-[2/3] rounded-xl overflow-hidden shadow-xl
          transition-all duration-300
          focus:scale-105 focus:ring-4 focus:ring-blue-500 focus:z-20 outline-none
          hover:scale-105
          bg-gray-800
        `,style:{background:C?void 0:w(b)},children:[C?x.jsx("img",{src:C,alt:b,className:"w-full h-full object-cover transition-opacity duration-500",onError:()=>j(null)}):x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"}),x.jsx("div",{className:"absolute bottom-10 -left-10 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none"}),x.jsx("div",{className:"absolute inset-0 flex items-center justify-center p-4 text-center",children:x.jsx("h3",{className:"text-gray-100 font-bold text-lg leading-snug drop-shadow-lg line-clamp-4 font-sans tracking-wide",children:g||b})})]}),x.jsxs("div",{className:"absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 flex flex-col justify-end p-3 text-left",children:[x.jsx("div",{className:"absolute top-2 right-2 flex gap-1",children:U?x.jsx("span",{className:"bg-green-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm",children:"READY"}):x.jsxs("span",{className:"bg-yellow-500 text-black text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm",children:[Math.round(O*100),"%"]})}),x.jsxs("div",{className:"text-xs text-gray-400 flex items-center gap-2 mt-auto",children:[x.jsxs("span",{className:"flex items-center gap-1",children:[x.jsx("svg",{className:"w-3 h-3",fill:"currentColor",viewBox:"0 0 20 20",children:x.jsx("path",{d:"M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"})}),r]}),M>0&&x.jsx("span",{className:"text-gray-500",children:Uy(M)}),B>0&&x.jsxs("span",{className:"text-green-400",children:["↓",Ny(B)]}),!U&&x.jsx("div",{className:"flex-1 h-1 bg-gray-700 rounded-full overflow-hidden",children:x.jsx("div",{style:{width:`${O*100}%`},className:"h-full bg-blue-500"})})]})]})]})},jy=({lastStateChange:b})=>{const[v,O]=yl.useState(0);yl.useEffect(()=>{if(!b)return;const U=setInterval(()=>{O(Math.floor((Date.now()-b)/1e3))},1e3);return()=>clearInterval(U)},[b]);const r=U=>{const M=Math.floor(U/60),B=U%60;return M>0?`${M}m ${B}s`:`${B}s`};return x.jsx("div",{className:"bg-yellow-600/90 text-yellow-100 p-4 rounded-lg mb-6 border border-yellow-500 animate-pulse mx-4",children:x.jsxs("div",{className:"flex items-center gap-3",children:[x.jsx("span",{className:"text-2xl",children:"❄️"}),x.jsxs("div",{children:[x.jsx("div",{className:"font-bold text-lg",children:"Cooling Down"}),x.jsxs("div",{className:"text-sm opacity-90",children:["High memory usage detected. Service may be slower.",x.jsx("span",{className:"ml-2 font-mono",children:r(v)})]})]})]})})},Cy=({status:b,retryAfter:v,onRetry:O})=>{const[r,U]=yl.useState(v||300);yl.useEffect(()=>{if(r<=0){O();return}const g=setTimeout(()=>U(w=>w-1),1e3);return()=>clearTimeout(g)},[r,O]);const M=b==="circuit_open",B=M?"🔌":"⚠️",C=M?"Storage Unavailable":"Server Error",j=M?"NFS/Storage is not responding. The server will retry automatically.":"A critical error occurred. Please wait for recovery.";return x.jsx("div",{className:"min-h-screen bg-gray-900 flex items-center justify-center p-6",children:x.jsxs("div",{className:"bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center",children:[x.jsx("div",{className:"text-6xl mb-4",children:B}),x.jsx("h1",{className:"text-2xl font-bold text-red-400 mb-2",children:C}),x.jsx("p",{className:"text-gray-300 mb-6",children:j}),x.jsx("button",{onClick:O,className:"mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors",children:"Retry Now"})]})})};function Hy(){const b=[{id:"net.gtvbox.videoplayer",name:"Vimu Player (Рекомендуем)"},{id:"org.videolan.vlc",name:"VLC for Android"},{id:"com.mxtech.videoplayer.ad",name:"MX Player"},{id:"",name:"System Chooser (Спрашивать всегда)"}],[v,O]=yl.useState(()=>fe.isNativePlatform()?localStorage.getItem("serverUrl")||"http://192.168.1.70:3000":""),[r,U]=yl.useState(localStorage.getItem("preferredPlayer")||"net.gtvbox.videoplayer"),[M,B]=yl.useState([]),[C,j]=yl.useState(""),[g,w]=yl.useState(!1),[R,Z]=yl.useState(null),[Tl,vl]=yl.useState(!1),[fl,pl]=yl.useState(!1),[P,Ml]=yl.useState(null),[Al,jl]=yl.useState("ok"),[ut,Vl]=yl.useState(null),[G,el]=yl.useState(null),[ql,tt]=yl.useState(localStorage.getItem("sortBy")||"name"),[Ul,zl]=yl.useState("all"),[mt,Yl]=yl.useState(null),[Kl,p]=yl.useState(!1),[D,X]=yl.useState(""),[il,K]=yl.useState([]),[s,E]=yl.useState(!1),N=[{id:"all",name:"Все",icon:"📚"},{id:"movie",name:"Фильмы",icon:"🎬"},{id:"series",name:"Сериалы",icon:"📺"},{id:"music",name:"Музыка",icon:"🎵"},{id:"other",name:"Другое",icon:"📁"}],H=z=>{const k=z.files||[],hl=k.filter(nt=>/\.(mp4|mkv|avi|webm|mov)$/i.test(nt.name));return k.filter(nt=>/\.(mp3|flac|m4a|ogg|wav)$/i.test(nt.name)).length>0&&hl.length===0?"music":hl.length>1?"series":hl.length===1?"movie":"other"},J=(()=>{let z=[...M];return Ul!=="all"&&(z=z.filter(k=>H(k)===Ul)),z.sort((k,hl)=>{switch(ql){case"name":return(k.name||"").localeCompare(hl.name||"");case"size":const al=k.files?.reduce((wl,yt)=>wl+(yt.length||0),0)||0;return(hl.files?.reduce((wl,yt)=>wl+(yt.length||0),0)||0)-al;case"peers":return(hl.numPeers||0)-(k.numPeers||0);default:return 0}}),z})(),I=z=>{U(z),localStorage.setItem("preferredPlayer",z)},kl=z=>{tt(z),localStorage.setItem("sortBy",z)},Dl=z=>{O(z),localStorage.setItem("serverUrl",z),vl(!1),At()},Rt=z=>v?`${v.replace(/\/$/,"")}${z}`:z,At=async()=>{try{const z=await fetch(Rt("/api/status"));z.status===503&&el(300);const k=await z.json();jl(k.serverStatus||"ok"),Vl(k.lastStateChange||null),B(k.torrents||[]),Z(null)}catch(z){console.error("Error fetching status:",z),M.length===0&&Z(`Connection Error: ${z.message}`)}};yl.useEffect(()=>{At();const z=setInterval(At,5e3);return()=>clearInterval(z)},[v]),yl.useEffect(()=>{if(!fe.isNativePlatform())return;const z=async k=>{k.url?.startsWith("magnet:")&&se(k.url)};return ci.addListener("appUrlOpen",z),()=>ci.removeAllListeners()},[v]);const se=async z=>{if(z){w(!0);try{await fetch(Rt("/api/add"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({magnet:z})}),j(""),At()}catch(k){Z(k.message)}finally{w(!1)}}},Xu=z=>{z.preventDefault(),se(C)},Gt=async()=>{if(D.trim()){E(!0),K([]);try{const k=await(await fetch(Rt(`/api/rutracker/search?query=${encodeURIComponent(D)}`))).json();K(k.results||[])}catch(z){console.error("[Search] Error:",z),Z("Ошибка поиска: "+z.message)}finally{E(!1)}}},Ga=async(z,k)=>{E(!0);try{if(z&&z.startsWith("magnet:"))await se(z),p(!1),K([]),X("");else{const al=await(await fetch(Rt(`/api/rutracker/magnet/${encodeURIComponent(z)}`))).json();al.magnet?(await se(al.magnet),p(!1),K([]),X("")):Z("Не удалось получить magnet-ссылку")}}catch(hl){Z("Ошибка: "+hl.message)}finally{E(!1)}};yl.useEffect(()=>{const z=()=>{P?Ml(null):Tl?vl(!1):ci.exitApp()},k=ci.addListener("backButton",()=>{console.log("Native Back Button"),z()}),hl=al=>{(al.key==="Escape"||al.key==="Backspace"||al.keyCode===10009)&&z()};return window.addEventListener("keydown",hl),()=>{k.then(al=>al.remove()),window.removeEventListener("keydown",hl)}},[P,Tl]);const La=async z=>{if(confirm("Remove this torrent?"))try{await fetch(Rt(`/api/delete/${z}`),{method:"DELETE"}),Ml(null),At()}catch{alert("Delete failed")}},Qa=(z,k)=>v?`${v.replace(/\/$/,"")}/stream/${z}/${k}`:`${window.location.protocol}//${window.location.host}/stream/${z}/${k}`,Ie=async(z,k,hl)=>{const al=Qa(z,k),nt=Lu(hl),wl=r;if(console.log(`[Play] URL: ${al} | Package: ${wl} | Title: ${nt}`),wl&&fe.isNativePlatform())try{const{installed:yt}=await Gu.isPackageInstalled({package:wl});if(!yt){const xl=b.find(Va=>Va.id===wl)?.name||wl;alert(`${xl} не установлен. Выберите другой плеер в настройках.`);return}}catch(yt){console.warn("[Play] isPackageInstalled check failed:",yt)}Yl({name:nt,progress:10}),Ml(null);try{await Gu.play({url:al,package:wl,title:nt}),Yl(null)}catch{console.error(`[Play] Failed with ${wl}, trying system chooser...`);try{await Gu.play({url:al,package:"",title:nt}),Yl(null)}catch(xl){Yl(null),alert("Error launching player: "+xl.message)}}},Xa=async(z,k=0)=>{const hl=z.files?.filter(xl=>/\.(mp4|mkv|avi|webm|mov)$/i.test(xl.name))||[];if(hl.length<=1){const xl=hl[0]||z.files?.[0];xl&&Ie(z.infoHash,xl.index,xl.name);return}const al=r,nt=Lu(z.name),wl=hl.map(xl=>Qa(z.infoHash,xl.index)),yt=hl.map(xl=>Lu(xl.name)||xl.name);if(console.log(`[PlayAll] ${wl.length} files | Package: ${al}`),al&&fe.isNativePlatform())try{const{installed:xl}=await Gu.isPackageInstalled({package:al});if(!xl){const Va=b.find(Zu=>Zu.id===al)?.name||al;alert(`${Va} не установлен. Выберите другой плеер в настройках.`);return}}catch(xl){console.warn("[PlayAll] isPackageInstalled check failed:",xl)}Yl({name:`${nt} (${wl.length} files)`,progress:10}),Ml(null);try{await Gu.playList({package:al,title:nt,urls:wl,names:yt,startIndex:k}),Yl(null)}catch(xl){console.error("[PlayAll] Playlist failed, falling back to single play:",xl),Yl(null),Ie(z.infoHash,hl[k]?.index||0,hl[k]?.name)}},Za=(z,k)=>{const hl=Qa(z,k);navigator.clipboard?.writeText(hl).then(()=>alert("URL copied!")).catch(()=>alert("Failed to copy"))};return Al==="circuit_open"||Al==="error"?x.jsx(Cy,{status:Al,retryAfter:G,onRetry:At}):x.jsxs("div",{className:"min-h-screen bg-[#141414] text-white font-sans selection:bg-red-500 selection:text-white pb-20",children:[x.jsxs("div",{className:"sticky top-0 z-30 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-gray-800",children:[x.jsx("h1",{className:"text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500",children:"PWA-TorServe"}),x.jsxs("div",{className:"flex gap-4",children:[x.jsx("button",{onClick:At,className:"p-2 hover:bg-gray-800 rounded-full transition-colors",children:"🔄"}),x.jsx("button",{onClick:()=>vl(!Tl),className:"p-2 hover:bg-gray-800 rounded-full transition-colors",children:"⚙️"})]})]}),Al==="degraded"&&x.jsx(jy,{lastStateChange:ut}),Tl&&x.jsxs("div",{className:"mx-6 mb-6 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl animate-fade-in relative z-20",children:[x.jsx("h2",{className:"text-xl font-bold mb-4 text-gray-200",children:"Settings"}),x.jsxs("div",{className:"mb-6",children:[x.jsx("label",{className:"text-gray-400 text-sm mb-3 block",children:"Default Video Player"}),x.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:b.map(z=>x.jsxs("button",{onClick:()=>I(z.id),className:`
                    p-4 rounded-lg border text-left transition-all
                    ${r===z.id?"bg-blue-600 border-blue-500 text-white shadow-lg scale-[1.02]":"bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"}
                  `,children:[x.jsx("div",{className:"font-bold",children:z.name}),x.jsx("div",{className:"text-xs opacity-75 mt-1",children:z.id||"System Default"})]},z.id))})]}),x.jsxs("div",{className:"border-t border-gray-800 pt-4",children:[x.jsxs("button",{onClick:()=>pl(!fl),className:"text-gray-500 text-sm hover:text-white flex items-center gap-2",children:[fl?"▼":"▶"," Advanced: Server Connection"]}),fl&&x.jsxs("div",{className:"mt-3 animate-fade-in",children:[x.jsx("label",{className:"text-gray-400 text-sm mb-2 block",children:"Server URL"}),x.jsx("div",{className:"flex gap-2",children:x.jsx("input",{value:v,onChange:z=>O(z.target.value),onBlur:z=>Dl(z.target.value),placeholder:"http://192.168.1.70:3000",className:"bg-gray-800 text-white px-4 py-2 rounded flex-1 border border-gray-700 focus:border-blue-500 outline-none"})}),x.jsx("p",{className:"text-xs text-gray-600 mt-1",children:"Change only if moving to a new server IP."})]})]})]}),x.jsxs("div",{className:"px-6 py-4",children:[x.jsxs("div",{className:"flex justify-between items-center mb-4",children:[x.jsx("h2",{className:"text-xl font-semibold text-gray-200",children:"My List"}),x.jsxs("div",{className:"flex gap-2",children:[x.jsx("button",{onClick:()=>p(!Kl),className:"bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105",children:"🔍 Поиск"}),!fl&&x.jsx("button",{onClick:()=>pl(!0),className:"bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-600 transition-transform hover:scale-105",children:"+ Magnet"})]})]}),Kl&&x.jsxs("div",{className:"mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50 animate-fade-in",children:[x.jsxs("div",{className:"flex gap-2 mb-4",children:[x.jsx("input",{value:D,onChange:z=>X(z.target.value),onKeyPress:z=>z.key==="Enter"&&Gt(),placeholder:"Поиск на RuTracker...",className:"flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none",autoFocus:!0}),x.jsx("button",{onClick:Gt,disabled:s,className:"bg-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50",children:s?"...":"🔍"}),x.jsx("button",{onClick:()=>{p(!1),K([])},className:"bg-gray-800 px-4 rounded-lg",children:"✕"})]}),il.length>0&&x.jsx("div",{className:"max-h-64 overflow-y-auto space-y-2",children:il.map((z,k)=>x.jsxs("div",{className:"flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors",children:[x.jsxs("div",{className:"flex-1 min-w-0",children:[x.jsx("div",{className:"text-sm font-medium text-white truncate",children:z.title}),x.jsxs("div",{className:"text-xs text-gray-400 flex gap-3 mt-1",children:[x.jsxs("span",{children:["📀 ",z.size]}),x.jsxs("span",{className:"text-green-400",children:["⬆ ",z.seeders]}),z.tracker&&x.jsx("span",{className:"text-purple-400",children:z.tracker})]})]}),x.jsx("button",{onClick:()=>Ga(z.magnet||z.id,z.title),disabled:s,className:"ml-3 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-bold disabled:opacity-50",children:"+ Add"})]},z.id||k))}),s&&x.jsx("div",{className:"text-center text-gray-400 py-4",children:x.jsx("span",{className:"animate-pulse",children:"Поиск..."})})]}),x.jsx("div",{className:"flex gap-2 mb-4 overflow-x-auto pb-3 pt-1 px-1 -mx-1",children:N.map(z=>x.jsxs("button",{onClick:()=>zl(z.id),className:`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#141414] focus:outline-none
                ${Ul===z.id?"bg-blue-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}
              `,children:[z.icon," ",z.name]},z.id))}),x.jsxs("div",{className:"flex gap-2 mb-6 text-xs px-1 -mx-1",children:[x.jsx("span",{className:"text-gray-500 self-center",children:"Сортировка:"}),[{id:"name",label:"Имя"},{id:"size",label:"Размер"},{id:"peers",label:"Пиры"}].map(z=>x.jsx("button",{onClick:()=>kl(z.id),className:`
                px-3 py-1 rounded transition-all
                focus:ring-2 focus:ring-blue-400 focus:outline-none
                ${ql===z.id?"bg-gray-700 text-white":"bg-gray-800/50 text-gray-500 hover:text-white"}
              `,children:z.label},z.id))]}),fl&&x.jsxs("form",{onSubmit:Xu,className:"mb-8 flex gap-2 animate-fade-in",children:[x.jsx("input",{value:C,onChange:z=>j(z.target.value),placeholder:"Paste magnet link...",className:"flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none",autoFocus:!0}),x.jsx("button",{disabled:g,className:"bg-blue-600 px-6 py-3 rounded-lg font-bold",children:g?"Adding...":"Add"}),x.jsx("button",{type:"button",onClick:()=>pl(!1),className:"bg-gray-800 px-4 rounded-lg",children:"✕"})]}),R&&x.jsx("div",{className:"bg-red-900/50 text-red-200 p-4 rounded-lg mb-6 border border-red-800",children:R}),x.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4",children:[J.map(z=>x.jsx(Dy,{name:z.name,progress:z.progress,peers:z.numPeers,size:z.files?.reduce((k,hl)=>k+(hl.length||0),0)||0,downloadSpeed:z.downloadSpeed||0,isReady:z.progress>=1||z.files?.length>0,onClick:()=>Ml(z)},z.infoHash)),J.length===0&&!g&&x.jsxs("div",{className:"col-span-full py-20 text-center text-gray-600",children:[x.jsx("div",{className:"text-6xl mb-4",children:Ul==="all"?"🍿":N.find(z=>z.id===Ul)?.icon}),x.jsx("p",{className:"text-lg",children:Ul==="all"?"Your list is empty.":"Нет торрентов в этой категории"})]})]})]}),P&&x.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in",onClick:()=>Ml(null),children:x.jsxs("div",{className:"bg-[#181818] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative",onClick:z=>z.stopPropagation(),children:[x.jsxs("div",{className:"h-32 bg-gradient-to-br from-blue-900 to-gray-900 p-6 flex items-end relative",children:[x.jsx("button",{onClick:()=>Ml(null),className:"absolute top-4 right-4 bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition-colors",children:"✕"}),x.jsx("h2",{className:"text-2xl font-bold leading-tight shadow-black drop-shadow-lg line-clamp-2",children:Lu(P.name)})]}),x.jsxs("div",{className:"p-6",children:[x.jsx("div",{className:"text-sm text-gray-400 mb-6 font-mono break-all text-xs border-l-2 border-gray-700 pl-3",children:P.name}),x.jsxs("div",{className:"space-y-3",children:[x.jsx("button",{autoFocus:!0,onClick:()=>{const z=P.files?.find(k=>/\.(mp4|mkv|avi|mov|webm)$/i.test(k.name))||P.files?.[0];z?Ie(P.infoHash,z.index,z.name):alert("No video files recognized")},className:"w-full bg-white text-black py-4 rounded font-bold hover:bg-gray-200 focus:bg-yellow-400 text-lg transition-colors flex items-center justify-center gap-2",children:"▶ Play"}),P.files?.filter(z=>/\.(mp4|mkv|avi|mov|webm)$/i.test(z.name)).length>1&&x.jsxs("button",{onClick:()=>Xa(P),className:"w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 focus:bg-blue-500 transition-colors flex items-center justify-center gap-2",children:["📺 Play All (",P.files?.filter(z=>/\.(mp4|mkv|avi|mov|webm)$/i.test(z.name)).length," episodes)"]}),x.jsxs("div",{className:"flex gap-2",children:[x.jsx("button",{onClick:()=>{const z=P.files?.[0];z&&Za(P.infoHash,z.index)},className:"flex-1 bg-gray-800 text-gray-300 py-3 rounded font-medium hover:bg-gray-700",children:"Copy Link"}),x.jsx("button",{onClick:()=>La(P.infoHash),className:"flex-1 bg-gray-800 text-red-400 py-3 rounded font-medium hover:bg-red-900/20",children:"Delete"})]})]})]})]})}),mt&&x.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm",children:x.jsxs("div",{className:"text-center",children:[x.jsx("div",{className:"text-6xl mb-4 animate-pulse",children:"⏳"}),x.jsx("h2",{className:"text-xl font-bold text-white mb-2",children:"Буферизация..."}),x.jsx("p",{className:"text-gray-400",children:mt.name}),x.jsx("div",{className:"mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto",children:x.jsx("div",{className:"h-full bg-blue-500 transition-all duration-300",style:{width:`${mt.progress||10}%`}})}),x.jsx("button",{onClick:()=>Yl(null),className:"mt-6 text-gray-500 hover:text-white",children:"Отмена"})]})})]})}vy.createRoot(document.getElementById("root")).render(x.jsx(yl.StrictMode,{children:x.jsx(Hy,{})}));export{Ld as W};
\n```\n\n### client/android/app/src/main/assets/public/assets/web-Bf-rnTBP.js\n\n```js\nimport{W as t}from"./index-DCNFAFrt.js";class s extends t{constructor(){super(),this.handleVisibilityChange=()=>{const e={isActive:document.hidden!==!0};this.notifyListeners("appStateChange",e),document.hidden?this.notifyListeners("pause",null):this.notifyListeners("resume",null)},document.addEventListener("visibilitychange",this.handleVisibilityChange,!1)}exitApp(){throw this.unimplemented("Not implemented on web.")}async getInfo(){throw this.unimplemented("Not implemented on web.")}async getLaunchUrl(){return{url:""}}async getState(){return{isActive:document.hidden!==!0}}async minimizeApp(){throw this.unimplemented("Not implemented on web.")}}export{s as AppWeb};
\n```\n\n### client/android/app/src/main/assets/public/assets/web-Bppy2vSi.js\n\n```js\nimport{W as o}from"./index-DCNFAFrt.js";class e extends o{constructor(){super(),this._lastWindow=null}async open(s){this._lastWindow=window.open(s.url,s.windowName||"_blank")}async close(){return new Promise((s,n)=>{this._lastWindow!=null?(this._lastWindow.close(),this._lastWindow=null,s()):n("No active window to close!")})}}const i=new e;export{i as Browser,e as BrowserWeb};
\n```\n\n### client/android/app/src/main/assets/public/cordova.js\n\n```js\n\n```\n\n### client/android/app/src/main/assets/public/cordova_plugins.js\n\n```js\n\n```\n\n### client/android/app/src/main/assets/public/manifest.json\n\n```json\n{
    "name": "PWA-TorServe",
    "short_name": "TorServe",
    "description": "Home Media Server Client",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#111827",
    "theme_color": "#2563eb",
    "icons": [
        {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}\n```\n\n### client/android/app/src/main/java/com/torserve/pwa/MainActivity.java\n\n```java\npackage com.torserve.pwa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TVPlayer.class);
        super.onCreate(savedInstanceState);
    }
}
\n```\n\n### client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java\n\n```java\npackage com.torserve.pwa;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import java.util.ArrayList;
import org.json.JSONArray;

@CapacitorPlugin(name = "TVPlayer")
public class TVPlayer extends Plugin {

    /**
     * Check if a package (player app) is installed
     */
    @PluginMethod
    public void isPackageInstalled(PluginCall call) {
        String packageName = call.getString("package");
        if (packageName == null) {
            call.reject("Package name required");
            return;
        }
        try {
            getContext().getPackageManager().getPackageInfo(packageName, 0);
            JSObject result = new JSObject();
            result.put("installed", true);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            JSObject result = new JSObject();
            result.put("installed", false);
            call.resolve(result);
        }
    }

    /**
     * Play a single video file with player-specific extras
     * Based on MatriX Vimu.kt and MX.kt implementations
     */
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("package");
        String title = call.getString("title", "Video");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), "video/*");

            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);

                // Vimu Player extras (net.gtvbox.videoplayer)
                if (packageName.contains("gtvbox")) {
                    intent.putExtra("forcename", title); // Show title instead of URL
                    intent.putExtra("forcedirect", true); // Direct access without buffering
                    intent.putExtra("forceresume", true); // Resume from last position
                }

                // MX Player extras (com.mxtech.videoplayer)
                if (packageName.contains("mxtech")) {
                    intent.putExtra("title", title);
                    intent.putExtra("sticky", false);
                }
            }

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error launching player: " + e.getMessage());
        }
    }

    /**
     * Play a playlist of video files (for series/multi-file torrents)
     * Vimu uses: asusfilelist, asusnamelist, startindex
     * MX uses: video_list, video_list.name
     */
    @PluginMethod
    public void playList(PluginCall call) {
        String packageName = call.getString("package");
        String title = call.getString("title", "Playlist");
        JSONArray urlsJson = call.getArray("urls");
        JSONArray namesJson = call.getArray("names");
        int startIndex = call.getInt("startIndex", 0);

        if (urlsJson == null || urlsJson.length() == 0) {
            call.reject("URLs array is required");
            return;
        }

        try {
            ArrayList<String> urls = new ArrayList<>();
            ArrayList<String> names = new ArrayList<>();

            for (int i = 0; i < urlsJson.length(); i++) {
                urls.add(urlsJson.getString(i));
                names.add(namesJson != null && i < namesJson.length()
                        ? namesJson.getString(i)
                        : "File " + (i + 1));
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);

            if (packageName != null && packageName.contains("gtvbox")) {
                // Vimu playlist format (from Vimu.kt)
                intent.setPackage(packageName);
                intent.setDataAndType(Uri.parse(urls.get(startIndex)),
                        "application/vnd.gtvbox.filelist");
                intent.putExtra("forcename", title);
                intent.putStringArrayListExtra("asusfilelist", urls);
                intent.putStringArrayListExtra("asusnamelist", names);
                intent.putExtra("startindex", startIndex);
            } else if (packageName != null && packageName.contains("mxtech")) {
                // MX Player playlist format (from MX.kt)
                intent.setPackage(packageName);
                intent.setDataAndType(Uri.parse(urls.get(startIndex)), "video/*");
                intent.putExtra("title", title);
                Uri[] uriArray = new Uri[urls.size()];
                for (int i = 0; i < urls.size(); i++) {
                    uriArray[i] = Uri.parse(urls.get(i));
                }
                intent.putExtra("video_list", uriArray);
                intent.putExtra("video_list.name", names.toArray(new String[0]));
                intent.putExtra("video_list.filename", names.toArray(new String[0]));
                intent.putExtra("video_list_is_explicit", true);
            } else {
                // Fallback: play single file from startIndex
                intent.setDataAndType(Uri.parse(urls.get(startIndex)), "video/*");
                if (packageName != null) {
                    intent.setPackage(packageName);
                }
            }

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error launching playlist: " + e.getMessage());
        }
    }
}
\n```\n\n### client/android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java\n\n```java\npackage com.getcapacitor.myapp;

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * Example local unit test, which will execute on the development machine (host).
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
public class ExampleUnitTest {

    @Test
    public void addition_isCorrect() throws Exception {
        assertEquals(4, 2 + 2);
    }
}
\n```\n\n### client/capacitor.config.json\n\n```json\n{
    "appId": "com.torserve.pwa",
    "appName": "PWA-TorServe",
    "webDir": "dist",
    "server": {
        "androidScheme": "https",
        "cleartext": true,
        "allowNavigation": [
            "192.168.1.70",
            "192.168.1.*",
            "*"
        ]
    },
    "android": {
        "allowMixedContent": true
    }
}\n```\n\n### client/eslint.config.js\n\n```js\nimport js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
\n```\n\n### client/package-lock.json\n\n```json\n{
  "name": "client",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "client",
      "version": "0.0.0",
      "dependencies": {
        "@capacitor/app": "^6.0.3",
        "@capacitor/browser": "^6.0.6",
        "@capacitor/core": "^6.2.1",
        "react": "^19.2.0",
        "react-dom": "^19.2.0"
      },
      "devDependencies": {
        "@capacitor/android": "^6.2.1",
        "@capacitor/cli": "^6.2.1",
        "@eslint/js": "^9.39.1",
        "@tailwindcss/postcss": "^4.1.17",
        "@types/react": "^19.2.5",
        "@types/react-dom": "^19.2.3",
        "@vitejs/plugin-react": "^5.1.1",
        "autoprefixer": "^10.4.22",
        "eslint": "^9.39.1",
        "eslint-plugin-react-hooks": "^7.0.1",
        "eslint-plugin-react-refresh": "^0.4.24",
        "globals": "^16.5.0",
        "postcss": "^8.5.6",
        "tailwindcss": "^4.1.17",
        "vite": "^7.2.4"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.27.1.tgz",
      "integrity": "sha512-cjQ7ZlQ0Mv3b47hABuTevyTuYN4i+loJKGeV9flcCgIK37cCXRh+L1bd3iBHlynerhQ7BhCkn2BPbQUL+rGqFg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.27.1",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.28.5.tgz",
      "integrity": "sha512-6uFXyCayocRbqhZOB+6XcuZbkMNimwfVGFji8CTZnCzOHVGvDqzvitu1re2AU5LROliz7eQPhB8CpAMvnx9EjA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.28.5.tgz",
      "integrity": "sha512-e7jT4DxYvIDLk1ZHmU/m/mB19rex9sv0c2ftBtjSBv+kVM/902eh0fINUzD7UwLLNR+jU585GxUJ8/EBfAM5fw==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "@babel/code-frame": "^7.27.1",
        "@babel/generator": "^7.28.5",
        "@babel/helper-compilation-targets": "^7.27.2",
        "@babel/helper-module-transforms": "^7.28.3",
        "@babel/helpers": "^7.28.4",
        "@babel/parser": "^7.28.5",
        "@babel/template": "^7.27.2",
        "@babel/traverse": "^7.28.5",
        "@babel/types": "^7.28.5",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.28.5.tgz",
      "integrity": "sha512-3EwLFhZ38J4VyIP6WNtt2kUdW9dokXA9Cr4IVIFHuCpZ3H8/YFOl5JjZHisrn1fATPBmKKqXzDFvh9fUwHz6CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.28.5",
        "@babel/types": "^7.28.5",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.27.2",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.27.2.tgz",
      "integrity": "sha512-2+1thGUUWWjLTYTHZWK1n8Yga0ijBz1XAhUXcKy81rd5g6yh7hGqMp45v7cadSbEHc9G3OTv45SyneRN3ps4DQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.27.2",
        "@babel/helper-validator-option": "^7.27.1",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.28.0.tgz",
      "integrity": "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.27.1.tgz",
      "integrity": "sha512-0gSFWUPNXNopqtIPQvlD5WgXYI5GY2kP2cCvoT8kczjbfcfuIljTbcWrulD1CIPIX2gt1wghbDy08yE1p+/r3w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.27.1",
        "@babel/types": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.28.3",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.28.3.tgz",
      "integrity": "sha512-gytXUbs8k2sXS9PnQptz5o0QnpLL51SwASIORY6XaBKF88nsOT0Zw9szLqlSGQDP/4TljBAD5y98p2U1fqkdsw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.27.1",
        "@babel/helper-validator-identifier": "^7.27.1",
        "@babel/traverse": "^7.28.3"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.27.1.tgz",
      "integrity": "sha512-1gn1Up5YXka3YYAHGKpbideQ5Yjf1tDa9qYcgysz+cNCXukyLl6DjPXhD3VRwSb8c0J9tA4b2+rHEZtc6R0tlw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.27.1.tgz",
      "integrity": "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.28.5.tgz",
      "integrity": "sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.27.1.tgz",
      "integrity": "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.28.4",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.28.4.tgz",
      "integrity": "sha512-HFN59MmQXGHVyYadKLVumYsA9dBFun/ldYxipEjzA4196jpLZd8UjEEBLkbEkvfYreDqJhZxYAWFPtrfhNpj4w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.27.2",
        "@babel/types": "^7.28.4"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.28.5.tgz",
      "integrity": "sha512-KKBU1VGYR7ORr3At5HAtUQ+TV3SzRCXmA/8OdDZiLDBIZxVyzXuztPjfLd3BV1PRAQGCMWWSHYhL0F8d5uHBDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.5"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.27.1.tgz",
      "integrity": "sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.27.1.tgz",
      "integrity": "sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.27.2",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.27.2.tgz",
      "integrity": "sha512-LPDZ85aEJyYSd18/DkjNh4/y1ntkE5KwUHWTiqgRxruuZL2F1yuHligVHLvcHY2vMHXttKFpJn6LwfI7cw7ODw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.27.1",
        "@babel/parser": "^7.27.2",
        "@babel/types": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.28.5.tgz",
      "integrity": "sha512-TCCj4t55U90khlYkVV/0TfkJkAkUg3jZFA3Neb7unZT8CPok7iiRfaX0F+WnqWqt7OxhOn0uBKXCw4lbL8W0aQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.27.1",
        "@babel/generator": "^7.28.5",
        "@babel/helper-globals": "^7.28.0",
        "@babel/parser": "^7.28.5",
        "@babel/template": "^7.27.2",
        "@babel/types": "^7.28.5",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.28.5.tgz",
      "integrity": "sha512-qQ5m48eI/MFLQ5PxQj4PFaprjyCTLI37ElWMmNs0K8Lk3dVeOdNpB3ks8jc7yM5CDmVC73eMVk/trk3fgmrUpA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.27.1",
        "@babel/helper-validator-identifier": "^7.28.5"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@capacitor/android": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/@capacitor/android/-/android-6.2.1.tgz",
      "integrity": "sha512-8gd4CIiQO5LAIlPIfd5mCuodBRxMMdZZEdj8qG8m+dQ1sQ2xyemVpzHmRK8qSCHorsBUCg3D62j2cp6bEBAkdw==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@capacitor/core": "^6.2.0"
      }
    },
    "node_modules/@capacitor/app": {
      "version": "6.0.3",
      "resolved": "https://registry.npmjs.org/@capacitor/app/-/app-6.0.3.tgz",
      "integrity": "sha512-4gFUCbcVz0N/YYN32OBFerocWXslIv3Nc90gDiRsBkJc0plwK6kIUT6PKa5WtW2kfhteUeCVXQbvArH2fH+0Ug==",
      "license": "MIT",
      "peerDependencies": {
        "@capacitor/core": "^6.0.0"
      }
    },
    "node_modules/@capacitor/browser": {
      "version": "6.0.6",
      "resolved": "https://registry.npmjs.org/@capacitor/browser/-/browser-6.0.6.tgz",
      "integrity": "sha512-VHOPkMR+JqKz2mf5YncnnOWvFdVYFTTLnPW+JRcsP1LobXmA0gtchER35PQ7XXqXU16eeacrehX+XF+rC6wmQw==",
      "license": "MIT",
      "peerDependencies": {
        "@capacitor/core": "^6.0.0"
      }
    },
    "node_modules/@capacitor/cli": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/@capacitor/cli/-/cli-6.2.1.tgz",
      "integrity": "sha512-JKl0FpFge8PgQNInw12kcKieQ4BmOyazQ4JGJOfEpVXlgrX1yPhSZTPjngupzTCiK3I7q7iGG5kjun0fDqgSCA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ionic/cli-framework-output": "^2.2.5",
        "@ionic/utils-fs": "^3.1.6",
        "@ionic/utils-subprocess": "2.1.11",
        "@ionic/utils-terminal": "^2.3.3",
        "commander": "^9.3.0",
        "debug": "^4.3.4",
        "env-paths": "^2.2.0",
        "kleur": "^4.1.4",
        "native-run": "^2.0.0",
        "open": "^8.4.0",
        "plist": "^3.0.5",
        "prompts": "^2.4.2",
        "rimraf": "^4.4.1",
        "semver": "^7.3.7",
        "tar": "^6.1.11",
        "tslib": "^2.4.0",
        "xml2js": "^0.5.0"
      },
      "bin": {
        "cap": "bin/capacitor",
        "capacitor": "bin/capacitor"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@capacitor/cli/node_modules/semver": {
      "version": "7.7.3",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.3.tgz",
      "integrity": "sha512-SdsKMrI9TdgjdweUSR9MweHA4EJ8YxHn8DFaDisvhVlUOe4BF1tLD7GAj0lIqWVl+dPb/rExr0Btby5loQm20Q==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@capacitor/core": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/@capacitor/core/-/core-6.2.1.tgz",
      "integrity": "sha512-urZwxa7hVE/BnA18oCFAdizXPse6fCKanQyEqpmz6cBJ2vObwMpyJDG5jBeoSsgocS9+Ax+9vb4ducWJn0y2qQ==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.12.tgz",
      "integrity": "sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.12.tgz",
      "integrity": "sha512-VJ+sKvNA/GE7Ccacc9Cha7bpS8nyzVv0jdVgwNDaR4gDMC/2TTRc33Ip8qrNYUcpkOHUT5OZ0bUcNNVZQ9RLlg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.12.tgz",
      "integrity": "sha512-6AAmLG7zwD1Z159jCKPvAxZd4y/VTO0VkprYy+3N2FtJ8+BQWFXU+OxARIwA46c5tdD9SsKGZ/1ocqBS/gAKHg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.12.tgz",
      "integrity": "sha512-5jbb+2hhDHx5phYR2By8GTWEzn6I9UqR11Kwf22iKbNpYrsmRB18aX/9ivc5cabcUiAT/wM+YIZ6SG9QO6a8kg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz",
      "integrity": "sha512-N3zl+lxHCifgIlcMUP5016ESkeQjLj/959RxxNYIthIg+CQHInujFuXeWbWMgnTo4cp5XVHqFPmpyu9J65C1Yg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.12.tgz",
      "integrity": "sha512-HQ9ka4Kx21qHXwtlTUVbKJOAnmG1ipXhdWTmNXiPzPfWKpXqASVcWdnf2bnL73wgjNrFXAa3yYvBSd9pzfEIpA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.12.tgz",
      "integrity": "sha512-gA0Bx759+7Jve03K1S0vkOu5Lg/85dou3EseOGUes8flVOGxbhDDh/iZaoek11Y8mtyKPGF3vP8XhnkDEAmzeg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.12.tgz",
      "integrity": "sha512-TGbO26Yw2xsHzxtbVFGEXBFH0FRAP7gtcPE7P5yP7wGy7cXK2oO7RyOhL5NLiqTlBh47XhmIUXuGciXEqYFfBQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.12.tgz",
      "integrity": "sha512-lPDGyC1JPDou8kGcywY0YILzWlhhnRjdof3UlcoqYmS9El818LLfJJc3PXXgZHrHCAKs/Z2SeZtDJr5MrkxtOw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.12.tgz",
      "integrity": "sha512-8bwX7a8FghIgrupcxb4aUmYDLp8pX06rGh5HqDT7bB+8Rdells6mHvrFHHW2JAOPZUbnjUpKTLg6ECyzvas2AQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.12.tgz",
      "integrity": "sha512-0y9KrdVnbMM2/vG8KfU0byhUN+EFCny9+8g202gYqSSVMonbsCfLjUO+rCci7pM0WBEtz+oK/PIwHkzxkyharA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.12.tgz",
      "integrity": "sha512-h///Lr5a9rib/v1GGqXVGzjL4TMvVTv+s1DPoxQdz7l/AYv6LDSxdIwzxkrPW438oUXiDtwM10o9PmwS/6Z0Ng==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.12.tgz",
      "integrity": "sha512-iyRrM1Pzy9GFMDLsXn1iHUm18nhKnNMWscjmp4+hpafcZjrr2WbT//d20xaGljXDBYHqRcl8HnxbX6uaA/eGVw==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.12.tgz",
      "integrity": "sha512-9meM/lRXxMi5PSUqEXRCtVjEZBGwB7P/D4yT8UG/mwIdze2aV4Vo6U5gD3+RsoHXKkHCfSxZKzmDssVlRj1QQA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.12.tgz",
      "integrity": "sha512-Zr7KR4hgKUpWAwb1f3o5ygT04MzqVrGEGXGLnj15YQDJErYu/BGg+wmFlIDOdJp0PmB0lLvxFIOXZgFRrdjR0w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.12.tgz",
      "integrity": "sha512-MsKncOcgTNvdtiISc/jZs/Zf8d0cl/t3gYWX8J9ubBnVOwlk65UIEEvgBORTiljloIWnBzLs4qhzPkJcitIzIg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.12.tgz",
      "integrity": "sha512-uqZMTLr/zR/ed4jIGnwSLkaHmPjOjJvnm6TVVitAa08SLS9Z0VM8wIRx7gWbJB5/J54YuIMInDquWyYvQLZkgw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-xXwcTq4GhRM7J9A8Gv5boanHhRa/Q9KLVmcyXHCTaM4wKfIpWkdXiMog/KsnxzJ0A1+nD+zoecuzqPmCRyBGjg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.12.tgz",
      "integrity": "sha512-Ld5pTlzPy3YwGec4OuHh1aCVCRvOXdH8DgRjfDy/oumVovmuSzWfnSJg+VtakB9Cm0gxNO9BzWkj6mtO1FMXkQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-fF96T6KsBo/pkQI950FARU9apGNTSlZGsv1jZBAlcLL1MLjLNIWPBkj5NlSz8aAzYKg+eNqknrUJ24QBybeR5A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.12.tgz",
      "integrity": "sha512-MZyXUkZHjQxUvzK7rN8DJ3SRmrVrke8ZyRusHlP+kuwqTcfWLyqMOE3sScPPyeIXN/mDJIfGXvcMqCgYKekoQw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.12.tgz",
      "integrity": "sha512-rm0YWsqUSRrjncSXGA7Zv78Nbnw4XL6/dzr20cyrQf7ZmRcsovpcRBdhD43Nuk3y7XIoW2OxMVvwuRvk9XdASg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.12.tgz",
      "integrity": "sha512-3wGSCDyuTHQUzt0nV7bocDy72r2lI33QL3gkDNGkod22EsYl04sMf0qLb8luNKTOmgF/eDEDP5BFNwoBKH441w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.12.tgz",
      "integrity": "sha512-rMmLrur64A7+DKlnSuwqUdRKyd3UE7oPJZmnljqEptesKM8wx9J8gx5u0+9Pq0fQQW8vqeKebwNXdfOyP+8Bsg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.12.tgz",
      "integrity": "sha512-HkqnmmBoCbCwxUKKNPBixiWDGCpQGVsrQfJoVGYLPT41XWF8lHuE5N6WhVia2n4o5QK5M4tYr21827fNhi4byQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.12.tgz",
      "integrity": "sha512-alJC0uCZpTFrSL0CCDjcgleBXPnCrEAhTBILpeAp7M/OFgoqtAetfBzX0xM00MUsVVPpVjlPuMbREqnZCXaTnA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.9.0",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.9.0.tgz",
      "integrity": "sha512-ayVFHdtZ+hsq1t2Dy24wCmGXGe4q9Gu3smhLYALJrr473ZH27MsnSL+LKUlimp4BWJqMDMLmPpx/Q9R3OAlL4g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz",
      "integrity": "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.21.1",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.21.1.tgz",
      "integrity": "sha512-aw1gNayWpdI/jSYVgzN5pL0cfzU02GT3NBpeT/DXbx1/1x7ZKxFPd9bwrzygx/qiwIQiJ1sw/zD8qY/kRvlGHA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.7",
        "debug": "^4.3.1",
        "minimatch": "^3.1.2"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.4.2.tgz",
      "integrity": "sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.17.0.tgz",
      "integrity": "sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.3.3.tgz",
      "integrity": "sha512-Kr+LPIUVKz2qkx1HAMH8q1q6azbqBAsXJUxBl/ODDuVPX45Z9DfwB8tPjTi6nNZ8BuM3nbJxC5zCAg5elnBUTQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.12.4",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.1.1",
        "minimatch": "^3.1.2",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.39.1",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.39.1.tgz",
      "integrity": "sha512-S26Stp4zCy88tH94QbBv3XCuzRQiZ9yXofEILmglYTh/Ug/a9/umqvgFtYBAo3Lp0nsI/5/qH1CCrbdK3AP1Tw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.7.tgz",
      "integrity": "sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.4.1.tgz",
      "integrity": "sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.1",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.1.tgz",
      "integrity": "sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.7",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.7.tgz",
      "integrity": "sha512-/zUx+yOsIrG4Y43Eh2peDeKCxlRt/gET6aHfaKpuq267qXdYDFViVHfMaLyygZOnl0kGWxFIgsBy8QFuTLUXEQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.1",
        "@humanwhocodes/retry": "^0.4.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@ionic/cli-framework-output": {
      "version": "2.2.8",
      "resolved": "https://registry.npmjs.org/@ionic/cli-framework-output/-/cli-framework-output-2.2.8.tgz",
      "integrity": "sha512-TshtaFQsovB4NWRBydbNFawql6yul7d5bMiW1WYYf17hd99V6xdDdk3vtF51bw6sLkxON3bDQpWsnUc9/hVo3g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ionic/utils-terminal": "2.3.5",
        "debug": "^4.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/@ionic/utils-array": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@ionic/utils-array/-/utils-array-2.1.5.tgz",
      "integrity": "sha512-HD72a71IQVBmQckDwmA8RxNVMTbxnaLbgFOl+dO5tbvW9CkkSFCv41h6fUuNsSEVgngfkn0i98HDuZC8mk+lTA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^4.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-fs": {
      "version": "3.1.7",
      "resolved": "https://registry.npmjs.org/@ionic/utils-fs/-/utils-fs-3.1.7.tgz",
      "integrity": "sha512-2EknRvMVfhnyhL1VhFkSLa5gOcycK91VnjfrTB0kbqkTFCOXyXgVLI5whzq7SLrgD9t1aqos3lMMQyVzaQ5gVA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/fs-extra": "^8.0.0",
        "debug": "^4.0.0",
        "fs-extra": "^9.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/@ionic/utils-object": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@ionic/utils-object/-/utils-object-2.1.5.tgz",
      "integrity": "sha512-XnYNSwfewUqxq+yjER1hxTKggftpNjFLJH0s37jcrNDwbzmbpFTQTVAp4ikNK4rd9DOebX/jbeZb8jfD86IYxw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^4.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-process": {
      "version": "2.1.10",
      "resolved": "https://registry.npmjs.org/@ionic/utils-process/-/utils-process-2.1.10.tgz",
      "integrity": "sha512-mZ7JEowcuGQK+SKsJXi0liYTcXd2bNMR3nE0CyTROpMECUpJeAvvaBaPGZf5ERQUPeWBVuwqAqjUmIdxhz5bxw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ionic/utils-object": "2.1.5",
        "@ionic/utils-terminal": "2.3.3",
        "debug": "^4.0.0",
        "signal-exit": "^3.0.3",
        "tree-kill": "^1.2.2",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-process/node_modules/@ionic/utils-terminal": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/@ionic/utils-terminal/-/utils-terminal-2.3.3.tgz",
      "integrity": "sha512-RnuSfNZ5fLEyX3R5mtcMY97cGD1A0NVBbarsSQ6yMMfRJ5YHU7hHVyUfvZeClbqkBC/pAqI/rYJuXKCT9YeMCQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/slice-ansi": "^4.0.0",
        "debug": "^4.0.0",
        "signal-exit": "^3.0.3",
        "slice-ansi": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0",
        "tslib": "^2.0.1",
        "untildify": "^4.0.0",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-stream": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/@ionic/utils-stream/-/utils-stream-3.1.5.tgz",
      "integrity": "sha512-hkm46uHvEC05X/8PHgdJi4l4zv9VQDELZTM+Kz69odtO9zZYfnt8DkfXHJqJ+PxmtiE5mk/ehJWLnn/XAczTUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^4.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-subprocess": {
      "version": "2.1.11",
      "resolved": "https://registry.npmjs.org/@ionic/utils-subprocess/-/utils-subprocess-2.1.11.tgz",
      "integrity": "sha512-6zCDixNmZCbMCy5np8klSxOZF85kuDyzZSTTQKQP90ZtYNCcPYmuFSzaqDwApJT4r5L3MY3JrqK1gLkc6xiUPw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ionic/utils-array": "2.1.5",
        "@ionic/utils-fs": "3.1.6",
        "@ionic/utils-process": "2.1.10",
        "@ionic/utils-stream": "3.1.5",
        "@ionic/utils-terminal": "2.3.3",
        "cross-spawn": "^7.0.3",
        "debug": "^4.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-subprocess/node_modules/@ionic/utils-fs": {
      "version": "3.1.6",
      "resolved": "https://registry.npmjs.org/@ionic/utils-fs/-/utils-fs-3.1.6.tgz",
      "integrity": "sha512-eikrNkK89CfGPmexjTfSWl4EYqsPSBh0Ka7by4F0PLc1hJZYtJxUZV3X4r5ecA8ikjicUmcbU7zJmAjmqutG/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/fs-extra": "^8.0.0",
        "debug": "^4.0.0",
        "fs-extra": "^9.0.0",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-subprocess/node_modules/@ionic/utils-terminal": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/@ionic/utils-terminal/-/utils-terminal-2.3.3.tgz",
      "integrity": "sha512-RnuSfNZ5fLEyX3R5mtcMY97cGD1A0NVBbarsSQ6yMMfRJ5YHU7hHVyUfvZeClbqkBC/pAqI/rYJuXKCT9YeMCQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/slice-ansi": "^4.0.0",
        "debug": "^4.0.0",
        "signal-exit": "^3.0.3",
        "slice-ansi": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0",
        "tslib": "^2.0.1",
        "untildify": "^4.0.0",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=10.3.0"
      }
    },
    "node_modules/@ionic/utils-terminal": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@ionic/utils-terminal/-/utils-terminal-2.3.5.tgz",
      "integrity": "sha512-3cKScz9Jx2/Pr9ijj1OzGlBDfcmx7OMVBt4+P1uRR0SSW4cm1/y3Mo4OY3lfkuaYifMNBW8Wz6lQHbs1bihr7A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/slice-ansi": "^4.0.0",
        "debug": "^4.0.0",
        "signal-exit": "^3.0.3",
        "slice-ansi": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0",
        "tslib": "^2.0.1",
        "untildify": "^4.0.0",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
      "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.0-beta.47",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0-beta.47.tgz",
      "integrity": "sha512-8QagwMH3kNCuzD8EWL8R2YPW5e4OrHNSAHRFDdmFqEwEaD/KcNKjVoumo+gP2vW5eKB2UPbM6vTYiGZX0ixLnw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.53.3.tgz",
      "integrity": "sha512-mRSi+4cBjrRLoaal2PnqH82Wqyb+d3HsPUN/W+WslCXsZsyHa9ZeQQX/pQsZaVIWDkPcpV6jJ+3KLbTbgnwv8w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.53.3.tgz",
      "integrity": "sha512-CbDGaMpdE9sh7sCmTrTUyllhrg65t6SwhjlMJsLr+J8YjFuPmCEjbBSx4Z/e4SmDyH3aB5hGaJUP2ltV/vcs4w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.53.3.tgz",
      "integrity": "sha512-Nr7SlQeqIBpOV6BHHGZgYBuSdanCXuw09hon14MGOLGmXAFYjx1wNvquVPmpZnl0tLjg25dEdr4IQ6GgyToCUA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.53.3.tgz",
      "integrity": "sha512-DZ8N4CSNfl965CmPktJ8oBnfYr3F8dTTNBQkRlffnUarJ2ohudQD17sZBa097J8xhQ26AwhHJ5mvUyQW8ddTsQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.53.3.tgz",
      "integrity": "sha512-yMTrCrK92aGyi7GuDNtGn2sNW+Gdb4vErx4t3Gv/Tr+1zRb8ax4z8GWVRfr3Jw8zJWvpGHNpss3vVlbF58DZ4w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.53.3.tgz",
      "integrity": "sha512-lMfF8X7QhdQzseM6XaX0vbno2m3hlyZFhwcndRMw8fbAGUGL3WFMBdK0hbUBIUYcEcMhVLr1SIamDeuLBnXS+Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.53.3.tgz",
      "integrity": "sha512-k9oD15soC/Ln6d2Wv/JOFPzZXIAIFLp6B+i14KhxAfnq76ajt0EhYc5YPeX6W1xJkAdItcVT+JhKl1QZh44/qw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.53.3.tgz",
      "integrity": "sha512-vTNlKq+N6CK/8UktsrFuc+/7NlEYVxgaEgRXVUVK258Z5ymho29skzW1sutgYjqNnquGwVUObAaxae8rZ6YMhg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.53.3.tgz",
      "integrity": "sha512-RGrFLWgMhSxRs/EWJMIFM1O5Mzuz3Xy3/mnxJp/5cVhZ2XoCAxJnmNsEyeMJtpK+wu0FJFWz+QF4mjCA7AUQ3w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.53.3.tgz",
      "integrity": "sha512-kASyvfBEWYPEwe0Qv4nfu6pNkITLTb32p4yTgzFCocHnJLAHs+9LjUu9ONIhvfT/5lv4YS5muBHyuV84epBo/A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-gnu/-/rollup-linux-loong64-gnu-4.53.3.tgz",
      "integrity": "sha512-JiuKcp2teLJwQ7vkJ95EwESWkNRFJD7TQgYmCnrPtlu50b4XvT5MOmurWNrCj3IFdyjBQ5p9vnrX4JM6I8OE7g==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.53.3.tgz",
      "integrity": "sha512-EoGSa8nd6d3T7zLuqdojxC20oBfNT8nexBbB/rkxgKj5T5vhpAQKKnD+h3UkoMuTyXkP5jTjK/ccNRmQrPNDuw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.53.3.tgz",
      "integrity": "sha512-4s+Wped2IHXHPnAEbIB0YWBv7SDohqxobiiPA1FIWZpX+w9o2i4LezzH/NkFUl8LRci/8udci6cLq+jJQlh+0g==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.53.3.tgz",
      "integrity": "sha512-68k2g7+0vs2u9CxDt5ktXTngsxOQkSEV/xBbwlqYcUrAVh6P9EgMZvFsnHy4SEiUl46Xf0IObWVbMvPrr2gw8A==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.53.3.tgz",
      "integrity": "sha512-VYsFMpULAz87ZW6BVYw3I6sWesGpsP9OPcyKe8ofdg9LHxSbRMd7zrVrr5xi/3kMZtpWL/wC+UIJWJYVX5uTKg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.53.3.tgz",
      "integrity": "sha512-3EhFi1FU6YL8HTUJZ51imGJWEX//ajQPfqWLI3BQq4TlvHy4X0MOr5q3D2Zof/ka0d5FNdPwZXm3Yyib/UEd+w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.53.3.tgz",
      "integrity": "sha512-eoROhjcc6HbZCJr+tvVT8X4fW3/5g/WkGvvmwz/88sDtSJzO7r/blvoBDgISDiCjDRZmHpwud7h+6Q9JxFwq1Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-openharmony-arm64": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openharmony-arm64/-/rollup-openharmony-arm64-4.53.3.tgz",
      "integrity": "sha512-OueLAWgrNSPGAdUdIjSWXw+u/02BRTcnfw9PN41D2vq/JSEPnJnVuBgw18VkN8wcd4fjUs+jFHVM4t9+kBSNLw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.53.3.tgz",
      "integrity": "sha512-GOFuKpsxR/whszbF/bzydebLiXIHSgsEUp6M0JI8dWvi+fFa1TD6YQa4aSZHtpmh2/uAlj/Dy+nmby3TJ3pkTw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.53.3.tgz",
      "integrity": "sha512-iah+THLcBJdpfZ1TstDFbKNznlzoxa8fmnFYK4V67HvmuNYkVdAywJSoteUszvBQ9/HqN2+9AZghbajMsFT+oA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-gnu": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-gnu/-/rollup-win32-x64-gnu-4.53.3.tgz",
      "integrity": "sha512-J9QDiOIZlZLdcot5NXEepDkstocktoVjkaKUtqzgzpt2yWjGlbYiKyp05rWwk4nypbYUNoFAztEgixoLaSETkg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.53.3.tgz",
      "integrity": "sha512-UhTd8u31dXadv0MopwGgNOBpUVROFKWVQgAg5N1ESyCz8AuBcMqm4AuTjrwgQKGDfoFuz02EuMRHQIw/frmYKQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@tailwindcss/node": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.1.17.tgz",
      "integrity": "sha512-csIkHIgLb3JisEFQ0vxr2Y57GUNYh447C8xzwj89U/8fdW8LhProdxvnVH6U8M2Y73QKiTIH+LWbK3V2BBZsAg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/remapping": "^2.3.4",
        "enhanced-resolve": "^5.18.3",
        "jiti": "^2.6.1",
        "lightningcss": "1.30.2",
        "magic-string": "^0.30.21",
        "source-map-js": "^1.2.1",
        "tailwindcss": "4.1.17"
      }
    },
    "node_modules/@tailwindcss/oxide": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.1.17.tgz",
      "integrity": "sha512-F0F7d01fmkQhsTjXezGBLdrl1KresJTcI3DB8EkScCldyKp3Msz4hub4uyYaVnk88BAS1g5DQjjF6F5qczheLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      },
      "optionalDependencies": {
        "@tailwindcss/oxide-android-arm64": "4.1.17",
        "@tailwindcss/oxide-darwin-arm64": "4.1.17",
        "@tailwindcss/oxide-darwin-x64": "4.1.17",
        "@tailwindcss/oxide-freebsd-x64": "4.1.17",
        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.1.17",
        "@tailwindcss/oxide-linux-arm64-gnu": "4.1.17",
        "@tailwindcss/oxide-linux-arm64-musl": "4.1.17",
        "@tailwindcss/oxide-linux-x64-gnu": "4.1.17",
        "@tailwindcss/oxide-linux-x64-musl": "4.1.17",
        "@tailwindcss/oxide-wasm32-wasi": "4.1.17",
        "@tailwindcss/oxide-win32-arm64-msvc": "4.1.17",
        "@tailwindcss/oxide-win32-x64-msvc": "4.1.17"
      }
    },
    "node_modules/@tailwindcss/oxide-android-arm64": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-android-arm64/-/oxide-android-arm64-4.1.17.tgz",
      "integrity": "sha512-BMqpkJHgOZ5z78qqiGE6ZIRExyaHyuxjgrJ6eBO5+hfrfGkuya0lYfw8fRHG77gdTjWkNWEEm+qeG2cDMxArLQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-arm64": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-arm64/-/oxide-darwin-arm64-4.1.17.tgz",
      "integrity": "sha512-EquyumkQweUBNk1zGEU/wfZo2qkp/nQKRZM8bUYO0J+Lums5+wl2CcG1f9BgAjn/u9pJzdYddHWBiFXJTcxmOg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-x64": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-x64/-/oxide-darwin-x64-4.1.17.tgz",
      "integrity": "sha512-gdhEPLzke2Pog8s12oADwYu0IAw04Y2tlmgVzIN0+046ytcgx8uZmCzEg4VcQh+AHKiS7xaL8kGo/QTiNEGRog==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-freebsd-x64": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-freebsd-x64/-/oxide-freebsd-x64-4.1.17.tgz",
      "integrity": "sha512-hxGS81KskMxML9DXsaXT1H0DyA+ZBIbyG/sSAjWNe2EDl7TkPOBI42GBV3u38itzGUOmFfCzk1iAjDXds8Oh0g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm-gnueabihf": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm-gnueabihf/-/oxide-linux-arm-gnueabihf-4.1.17.tgz",
      "integrity": "sha512-k7jWk5E3ldAdw0cNglhjSgv501u7yrMf8oeZ0cElhxU6Y2o7f8yqelOp3fhf7evjIS6ujTI3U8pKUXV2I4iXHQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-gnu": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-gnu/-/oxide-linux-arm64-gnu-4.1.17.tgz",
      "integrity": "sha512-HVDOm/mxK6+TbARwdW17WrgDYEGzmoYayrCgmLEw7FxTPLcp/glBisuyWkFz/jb7ZfiAXAXUACfyItn+nTgsdQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-musl": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-musl/-/oxide-linux-arm64-musl-4.1.17.tgz",
      "integrity": "sha512-HvZLfGr42i5anKtIeQzxdkw/wPqIbpeZqe7vd3V9vI3RQxe3xU1fLjss0TjyhxWcBaipk7NYwSrwTwK1hJARMg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-gnu": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-gnu/-/oxide-linux-x64-gnu-4.1.17.tgz",
      "integrity": "sha512-M3XZuORCGB7VPOEDH+nzpJ21XPvK5PyjlkSFkFziNHGLc5d6g3di2McAAblmaSUNl8IOmzYwLx9NsE7bplNkwQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-musl": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-musl/-/oxide-linux-x64-musl-4.1.17.tgz",
      "integrity": "sha512-k7f+pf9eXLEey4pBlw+8dgfJHY4PZ5qOUFDyNf7SI6lHjQ9Zt7+NcscjpwdCEbYi6FI5c2KDTDWyf2iHcCSyyQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-wasm32-wasi": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.1.17.tgz",
      "integrity": "sha512-cEytGqSSoy7zK4JRWiTCx43FsKP/zGr0CsuMawhH67ONlH+T79VteQeJQRO/X7L0juEUA8ZyuYikcRBf0vsxhg==",
      "bundleDependencies": [
        "@napi-rs/wasm-runtime",
        "@emnapi/core",
        "@emnapi/runtime",
        "@tybys/wasm-util",
        "@emnapi/wasi-threads",
        "tslib"
      ],
      "cpu": [
        "wasm32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/core": "^1.6.0",
        "@emnapi/runtime": "^1.6.0",
        "@emnapi/wasi-threads": "^1.1.0",
        "@napi-rs/wasm-runtime": "^1.0.7",
        "@tybys/wasm-util": "^0.10.1",
        "tslib": "^2.4.0"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-arm64-msvc": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-arm64-msvc/-/oxide-win32-arm64-msvc-4.1.17.tgz",
      "integrity": "sha512-JU5AHr7gKbZlOGvMdb4722/0aYbU+tN6lv1kONx0JK2cGsh7g148zVWLM0IKR3NeKLv+L90chBVYcJ8uJWbC9A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-x64-msvc": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-x64-msvc/-/oxide-win32-x64-msvc-4.1.17.tgz",
      "integrity": "sha512-SKWM4waLuqx0IH+FMDUw6R66Hu4OuTALFgnleKbqhgGU30DY20NORZMZUKgLRjQXNN2TLzKvh48QXTig4h4bGw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@tailwindcss/postcss": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/@tailwindcss/postcss/-/postcss-4.1.17.tgz",
      "integrity": "sha512-+nKl9N9mN5uJ+M7dBOOCzINw94MPstNR/GtIhz1fpZysxL/4a+No64jCBD6CPN+bIHWFx3KWuu8XJRrj/572Dw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "@tailwindcss/node": "4.1.17",
        "@tailwindcss/oxide": "4.1.17",
        "postcss": "^8.4.41",
        "tailwindcss": "4.1.17"
      }
    },
    "node_modules/@types/babel__core": {
      "version": "7.20.5",
      "resolved": "https://registry.npmjs.org/@types/babel__core/-/babel__core-7.20.5.tgz",
      "integrity": "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.20.7",
        "@babel/types": "^7.20.7",
        "@types/babel__generator": "*",
        "@types/babel__template": "*",
        "@types/babel__traverse": "*"
      }
    },
    "node_modules/@types/babel__generator": {
      "version": "7.27.0",
      "resolved": "https://registry.npmjs.org/@types/babel__generator/-/babel__generator-7.27.0.tgz",
      "integrity": "sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__template": {
      "version": "7.4.4",
      "resolved": "https://registry.npmjs.org/@types/babel__template/-/babel__template-7.4.4.tgz",
      "integrity": "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.1.0",
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__traverse": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@types/babel__traverse/-/babel__traverse-7.28.0.tgz",
      "integrity": "sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.2"
      }
    },
    "node_modules/@types/estree": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
      "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/fs-extra": {
      "version": "8.1.5",
      "resolved": "https://registry.npmjs.org/@types/fs-extra/-/fs-extra-8.1.5.tgz",
      "integrity": "sha512-0dzKcwO+S8s2kuF5Z9oUWatQJj5Uq/iqphEtE3GQJVRRYm/tD1LglU2UnXi2A8jLq5umkGouOXOR9y0n613ZwQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "24.10.1",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-24.10.1.tgz",
      "integrity": "sha512-GNWcUTRBgIRJD5zj+Tq0fKOJ5XZajIiBroOF0yvj2bSU1WvNdYS/dn9UxwsujGW4JX06dnHyjV2y9rRaybH0iQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~7.16.0"
      }
    },
    "node_modules/@types/react": {
      "version": "19.2.7",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.2.7.tgz",
      "integrity": "sha512-MWtvHrGZLFttgeEj28VXHxpmwYbor/ATPYbBfSFZEIRK0ecCFLl2Qo55z52Hss+UV9CRN7trSeq1zbgx7YDWWg==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.2.3",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.2.3.tgz",
      "integrity": "sha512-jp2L/eY6fn+KgVVQAOqYItbF0VY/YApe5Mz2F0aykSO8gx31bYCZyvSeYxCHKvzHG5eZjc+zyaS5BrBWya2+kQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.2.0"
      }
    },
    "node_modules/@types/slice-ansi": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/@types/slice-ansi/-/slice-ansi-4.0.0.tgz",
      "integrity": "sha512-+OpjSaq85gvlZAYINyzKpLeiFkSC4EsC6IIiT6v6TLSU5k5U83fHGj9Lel8oKEXM0HqgrMVCjXPDPVICtxF7EQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-5.1.1.tgz",
      "integrity": "sha512-WQfkSw0QbQ5aJ2CHYw23ZGkqnRwqKHD/KYsMeTkZzPT4Jcf0DcBxBtwMJxnu6E7oxw5+JC6ZAiePgh28uJ1HBA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.28.5",
        "@babel/plugin-transform-react-jsx-self": "^7.27.1",
        "@babel/plugin-transform-react-jsx-source": "^7.27.1",
        "@rolldown/pluginutils": "1.0.0-beta.47",
        "@types/babel__core": "^7.20.5",
        "react-refresh": "^0.18.0"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "peerDependencies": {
        "vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"
      }
    },
    "node_modules/@xmldom/xmldom": {
      "version": "0.8.11",
      "resolved": "https://registry.npmjs.org/@xmldom/xmldom/-/xmldom-0.8.11.tgz",
      "integrity": "sha512-cQzWCtO6C8TQiYl1ruKNn2U6Ao4o4WBBcbL61yJl84x+j5sOWWFU9X7DpND8XZG3daDppSsigMdfAIl2upQBRw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/acorn": {
      "version": "8.15.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.15.0.tgz",
      "integrity": "sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/ajv": {
      "version": "6.12.6",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.12.6.tgz",
      "integrity": "sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true,
      "license": "Python-2.0"
    },
    "node_modules/astral-regex": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/astral-regex/-/astral-regex-2.0.0.tgz",
      "integrity": "sha512-Z7tMw1ytTXt5jqMcOP+OQteU1VuNK9Y02uuJtKQ1Sv69jXQKKg5cibLwGJow8yzZP+eAc18EmLGPal0bp36rvQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/at-least-node": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/at-least-node/-/at-least-node-1.0.0.tgz",
      "integrity": "sha512-+q/t7Ekv1EDY2l6Gda6LLiX14rU9TV20Wa3ofeQmwPFZbOMo9DXrLbOjFaaclkXKWidIaopwAObQDqwWtGUjqg==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">= 4.0.0"
      }
    },
    "node_modules/autoprefixer": {
      "version": "10.4.22",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.4.22.tgz",
      "integrity": "sha512-ARe0v/t9gO28Bznv6GgqARmVqcWOV3mfgUPn9becPHMiD3o9BwlRgaeccZnwTpZ7Zwqrm+c1sUSsMxIzQzc8Xg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.27.0",
        "caniuse-lite": "^1.0.30001754",
        "fraction.js": "^5.3.4",
        "normalize-range": "^0.1.2",
        "picocolors": "^1.1.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.8.32",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.8.32.tgz",
      "integrity": "sha512-OPz5aBThlyLFgxyhdwf/s2+8ab3OvT7AdTNvKHBwpXomIYeXqpUUuT8LrdtxZSsWJ4R4CU1un4XGh5Ez3nlTpw==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.js"
      }
    },
    "node_modules/big-integer": {
      "version": "1.6.52",
      "resolved": "https://registry.npmjs.org/big-integer/-/big-integer-1.6.52.tgz",
      "integrity": "sha512-QxD8cf2eVqJOOz63z6JIN9BzvVs/dlySa5HGSBH5xtR8dPteIRQnBxxKqkNTiT6jbDTF6jAfrd4oMcND9RGbQg==",
      "dev": true,
      "license": "Unlicense",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/bplist-parser": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/bplist-parser/-/bplist-parser-0.3.2.tgz",
      "integrity": "sha512-apC2+fspHGI3mMKj+dGevkGo/tCqVB8jMb6i+OX+E29p0Iposz07fABkRIfVUPNd5A5VbuOz1bZbnmkKLYF+wQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "big-integer": "1.6.x"
      },
      "engines": {
        "node": ">= 5.10.0"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/browserslist": {
      "version": "4.28.0",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.28.0.tgz",
      "integrity": "sha512-tbydkR/CxfMwelN0vwdP/pLkDwyAASZ+VfWm4EOwlB6SWhx1sYnWLqo8N5j0rAzPfzfRaxt0mM/4wPU/Su84RQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "baseline-browser-mapping": "^2.8.25",
        "caniuse-lite": "^1.0.30001754",
        "electron-to-chromium": "^1.5.249",
        "node-releases": "^2.0.27",
        "update-browserslist-db": "^1.1.4"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/buffer-crc32": {
      "version": "0.2.13",
      "resolved": "https://registry.npmjs.org/buffer-crc32/-/buffer-crc32-0.2.13.tgz",
      "integrity": "sha512-VO9Ht/+p3SN7SKWqcrgEzjGbRSJYTx+Q1pTQC0wrWqHx0vpJraQ6GtHx8tvcg1rlK1byhU5gccxgOgj7B0TDkQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001757",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001757.tgz",
      "integrity": "sha512-r0nnL/I28Zi/yjk1el6ilj27tKcdjLsNqAOZr0yVjWPrSQyHgKI2INaEWw21bAQSv2LXRt1XuCS/GomNpWOxsQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/chownr": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/chownr/-/chownr-2.0.0.tgz",
      "integrity": "sha512-bIomtDF5KGpdogkLd9VspvFzk9KfpyyGlS8YFVZl7TGPBHL5snIOnxeshwVgPteQ9b4Eydl+pVbIyE1DcvCWgQ==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/commander": {
      "version": "9.5.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-9.5.0.tgz",
      "integrity": "sha512-KRs7WVDKg86PWiuAqhDrAQnTXZKraVcCc6vFdL14qrZ/DcWwuRo7VoiYXalXO7S5GKpqYiVEwCbgFDfxNHKJBQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.20.0 || >=14"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/define-lazy-prop": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/define-lazy-prop/-/define-lazy-prop-2.0.0.tgz",
      "integrity": "sha512-Ds09qNh8yw3khSjiJjiUInaGX9xlqZDY7JVryGxdxV7NPeuqQfplOpQ66yJFZut3jLa5zOwkXw1g9EI2uKh4Og==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.262",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.262.tgz",
      "integrity": "sha512-NlAsMteRHek05jRUxUR0a5jpjYq9ykk6+kO0yRaMi5moe7u0fVIOeQ3Y30A8dIiWFBNUoQGi1ljb1i5VtS9WQQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/elementtree": {
      "version": "0.1.7",
      "resolved": "https://registry.npmjs.org/elementtree/-/elementtree-0.1.7.tgz",
      "integrity": "sha512-wkgGT6kugeQk/P6VZ/f4T+4HB41BVgNBq5CDIZVbQ02nvTVqAiVTbskxxu3eA/X96lMlfYOwnLQpN2v5E1zDEg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "sax": "1.1.4"
      },
      "engines": {
        "node": ">= 0.4.0"
      }
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/enhanced-resolve": {
      "version": "5.18.3",
      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.18.3.tgz",
      "integrity": "sha512-d4lC8xfavMeBjzGr2vECC3fsGXziXZQyJxD868h2M/mBI3PwAuODxAkLkq5HYuvrPYcUtiLzsTo8U3PgX3Ocww==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.4",
        "tapable": "^2.2.0"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/env-paths": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/env-paths/-/env-paths-2.2.1.tgz",
      "integrity": "sha512-+h1lkLKhZMTYjog1VEpJNG7NZJWcuc2DDk/qsqSTRRCOXiLjeQ1d1/udrUGhqMxUgAlwKNZ0cf2uqan5GLuS2A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/esbuild": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz",
      "integrity": "sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.25.12",
        "@esbuild/android-arm": "0.25.12",
        "@esbuild/android-arm64": "0.25.12",
        "@esbuild/android-x64": "0.25.12",
        "@esbuild/darwin-arm64": "0.25.12",
        "@esbuild/darwin-x64": "0.25.12",
        "@esbuild/freebsd-arm64": "0.25.12",
        "@esbuild/freebsd-x64": "0.25.12",
        "@esbuild/linux-arm": "0.25.12",
        "@esbuild/linux-arm64": "0.25.12",
        "@esbuild/linux-ia32": "0.25.12",
        "@esbuild/linux-loong64": "0.25.12",
        "@esbuild/linux-mips64el": "0.25.12",
        "@esbuild/linux-ppc64": "0.25.12",
        "@esbuild/linux-riscv64": "0.25.12",
        "@esbuild/linux-s390x": "0.25.12",
        "@esbuild/linux-x64": "0.25.12",
        "@esbuild/netbsd-arm64": "0.25.12",
        "@esbuild/netbsd-x64": "0.25.12",
        "@esbuild/openbsd-arm64": "0.25.12",
        "@esbuild/openbsd-x64": "0.25.12",
        "@esbuild/openharmony-arm64": "0.25.12",
        "@esbuild/sunos-x64": "0.25.12",
        "@esbuild/win32-arm64": "0.25.12",
        "@esbuild/win32-ia32": "0.25.12",
        "@esbuild/win32-x64": "0.25.12"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "9.39.1",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.39.1.tgz",
      "integrity": "sha512-BhHmn2yNOFA9H9JmmIVKJmd288g9hrVRDkdoIgRCRuSySRUHH7r/DI6aAXW9T1WwUuY3DFgrcaqB+deURBLR5g==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.8.0",
        "@eslint-community/regexpp": "^4.12.1",
        "@eslint/config-array": "^0.21.1",
        "@eslint/config-helpers": "^0.4.2",
        "@eslint/core": "^0.17.0",
        "@eslint/eslintrc": "^3.3.1",
        "@eslint/js": "9.39.1",
        "@eslint/plugin-kit": "^0.4.1",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "ajv": "^6.12.4",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.4.0",
        "eslint-visitor-keys": "^4.2.1",
        "espree": "^10.4.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.2",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-7.0.1.tgz",
      "integrity": "sha512-O0d0m04evaNzEPoSW+59Mezf8Qt0InfgGIBJnpC0h3NH/WjUAR7BIKUfysC6todmtiZ/A0oUVS8Gce0WhBrHsA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.24.4",
        "@babel/parser": "^7.24.4",
        "hermes-parser": "^0.25.1",
        "zod": "^3.25.0 || ^4.0.0",
        "zod-validation-error": "^3.5.0 || ^4.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0"
      }
    },
    "node_modules/eslint-plugin-react-refresh": {
      "version": "0.4.24",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.4.24.tgz",
      "integrity": "sha512-nLHIW7TEq3aLrEYWpVaJ1dRgFR+wLDPN8e8FpYAql/bMV2oBEfC37K0gLEGgv9fy66juNShSMV8OkTqzltcG/w==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "eslint": ">=8.40"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.4.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.4.0.tgz",
      "integrity": "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.4.0.tgz",
      "integrity": "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.15.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.6.0.tgz",
      "integrity": "sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fd-slicer": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/fd-slicer/-/fd-slicer-1.1.0.tgz",
      "integrity": "sha512-cE1qsB/VwyQozZ+q1dGxR8LBYNZeofhEdUNGSMbQD3Gw2lAzX9Zb3uIU6Ebc/Fmyjo9AWWfnn0AUCHqtevs/8g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "pend": "~1.2.0"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.3.3.tgz",
      "integrity": "sha512-GX+ysw4PBCz0PzosHDepZGANEuFCMLrnRTiEy9McGjmkCQYwRq4A/X786G/fjM/+OjsWSU1ZrY5qyARZmO/uwg==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fraction.js": {
      "version": "5.3.4",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-5.3.4.tgz",
      "integrity": "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/fs-extra": {
      "version": "9.1.0",
      "resolved": "https://registry.npmjs.org/fs-extra/-/fs-extra-9.1.0.tgz",
      "integrity": "sha512-hcg3ZmepS30/7BSFqRvoo3DOMQu7IjqxO5nCDt+zM9XWjb33Wg7ziNT+Qvqbuc3+gWpzO02JubVyk2G4Zvo1OQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "at-least-node": "^1.0.0",
        "graceful-fs": "^4.2.0",
        "jsonfile": "^6.0.1",
        "universalify": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/fs-minipass": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fs-minipass/-/fs-minipass-2.1.0.tgz",
      "integrity": "sha512-V/JgOLFCS+R6Vcq0slCuaeWEdNC3ouDlJMNIsacH2VtALiu9mV4LPrHc5cDl8k5aw6J8jwgWWpiTo5RYhmIzvg==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "minipass": "^3.0.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/fs-minipass/node_modules/minipass": {
      "version": "3.3.6",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-3.3.6.tgz",
      "integrity": "sha512-DxiNidxSEK+tHG6zOIklvNOwm3hvCrbUrdtzY74U6HKTJxvIDfOUL5W5P2Ghd3DTkhhKPYGqeNUIh5qcM4YBfw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/fs-minipass/node_modules/yallist": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz",
      "integrity": "sha512-3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fs.realpath": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/fs.realpath/-/fs.realpath-1.0.0.tgz",
      "integrity": "sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/glob": {
      "version": "9.3.5",
      "resolved": "https://registry.npmjs.org/glob/-/glob-9.3.5.tgz",
      "integrity": "sha512-e1LleDykUz2Iu+MTYdkSsuWX8lvAjAcs0Xef0lNIu0S2wOAzuTxCJtcd9S3cijlwYF18EsU3rzb8jPVobxDh9Q==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "fs.realpath": "^1.0.0",
        "minimatch": "^8.0.2",
        "minipass": "^4.2.4",
        "path-scurry": "^1.6.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/glob/node_modules/brace-expansion": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.2.tgz",
      "integrity": "sha512-Jt0vHyM+jmUBqojB7E1NIYadt0vI0Qxjxd2TErW94wDz+E2LAm5vKMXXwg6ZZBTHPuUlDgQHKXvjGBdfcF1ZDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/glob/node_modules/minimatch": {
      "version": "8.0.4",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-8.0.4.tgz",
      "integrity": "sha512-W0Wvr9HyFXZRGIDgCicunpQ299OKXs9RgZfaukz4qAW/pJhcpUfupc9c+OObPOFueNy8VSrZgEmDtk6Kh4WzDA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/globals": {
      "version": "16.5.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-16.5.0.tgz",
      "integrity": "sha512-c/c15i26VrJ4IRt5Z89DnIzCGDn9EcebibhAOjw5ibqEHsE1wLUgkPn9RDmNcUKyU87GeaL633nyJ+pplFR2ZQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/hermes-estree": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-estree/-/hermes-estree-0.25.1.tgz",
      "integrity": "sha512-0wUoCcLp+5Ev5pDW2OriHC2MJCbwLwuRx+gAqMTOkGKJJiBCLjtrvy4PWUGn6MIVefecRpzoOZ/UV6iGdOr+Cw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/hermes-parser": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-parser/-/hermes-parser-0.25.1.tgz",
      "integrity": "sha512-6pEjquH3rqaI6cYAXYPcz9MS4rY6R4ngRgrgfDshRptUZIc3lw0MCIJIGDj9++mfySOuPTHB4nrSW99BCvOPIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hermes-estree": "0.25.1"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/ini": {
      "version": "4.1.3",
      "resolved": "https://registry.npmjs.org/ini/-/ini-4.1.3.tgz",
      "integrity": "sha512-X7rqawQBvfdjS10YU1y1YVreA3SsLrW9dX2CewP2EbBJM4ypVNLDkO5y04gejPwKIY9lR+7r9gn3rFPt/kmWFg==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": "^14.17.0 || ^16.13.0 || >=18.0.0"
      }
    },
    "node_modules/is-docker": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/is-docker/-/is-docker-2.2.1.tgz",
      "integrity": "sha512-F+i2BKsFrH66iaUFc0woD8sLy8getkwTwtOBjvs56Cx4CgJDeKQeqfz8wAYiSb8JOprWhHH5p77PbmYCvvUuXQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "is-docker": "cli.js"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-wsl": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/is-wsl/-/is-wsl-2.2.0.tgz",
      "integrity": "sha512-fKzAra0rGJUUBwGBgNkHZuToZcn+TtXHpeCgmkMJMMYx1sQDYaCSyjJBSCa2nH1DGm7s3n1oBnohoVTBaN7Lww==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-docker": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/jiti": {
      "version": "2.6.1",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.6.1.tgz",
      "integrity": "sha512-ekilCSN1jwRvIbgeg/57YFh8qQDNbwDb9xT/qu2DAHbFFZUicIl4ygVaAvzveMhMVr3LnpSKTNnwt8PoOfmKhQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.1.tgz",
      "integrity": "sha512-qQKT4zQxXl8lLwBtHMWwaTcGfFOZviOJet3Oy/xmGk2gZH677CJM9EvtfdSkgWcATZhj/55JZ0rmy3myCT5lsA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/jsonfile": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/jsonfile/-/jsonfile-6.2.0.tgz",
      "integrity": "sha512-FGuPw30AdOIUTRMC2OMRtQV+jkVj2cfPqSeWXv1NEAJ1qZ5zb1X6z1mFhbfOB/iy3ssJCD+3KuZ8r8C3uVFlAg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "universalify": "^2.0.0"
      },
      "optionalDependencies": {
        "graceful-fs": "^4.1.6"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/kleur": {
      "version": "4.1.5",
      "resolved": "https://registry.npmjs.org/kleur/-/kleur-4.1.5.tgz",
      "integrity": "sha512-o+NO+8WrRiQEE4/7nwRJhN1HWpVmJm511pBHUxPLtp0BUISzlBplORYSmTclCnJvQq2tKu/sgl3xVpkc7ZWuQQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.30.2.tgz",
      "integrity": "sha512-utfs7Pr5uJyyvDETitgsaqSyjCb2qNRAtuqUeWIAKztsOYdcACf2KtARYXg2pSvhkt+9NfoaNY7fxjl6nuMjIQ==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.30.2",
        "lightningcss-darwin-arm64": "1.30.2",
        "lightningcss-darwin-x64": "1.30.2",
        "lightningcss-freebsd-x64": "1.30.2",
        "lightningcss-linux-arm-gnueabihf": "1.30.2",
        "lightningcss-linux-arm64-gnu": "1.30.2",
        "lightningcss-linux-arm64-musl": "1.30.2",
        "lightningcss-linux-x64-gnu": "1.30.2",
        "lightningcss-linux-x64-musl": "1.30.2",
        "lightningcss-win32-arm64-msvc": "1.30.2",
        "lightningcss-win32-x64-msvc": "1.30.2"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.30.2.tgz",
      "integrity": "sha512-BH9sEdOCahSgmkVhBLeU7Hc9DWeZ1Eb6wNS6Da8igvUwAe0sqROHddIlvU06q3WyXVEOYDZ6ykBZQnjTbmo4+A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.30.2.tgz",
      "integrity": "sha512-ylTcDJBN3Hp21TdhRT5zBOIi73P6/W0qwvlFEk22fkdXchtNTOU4Qc37SkzV+EKYxLouZ6M4LG9NfZ1qkhhBWA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.30.2.tgz",
      "integrity": "sha512-oBZgKchomuDYxr7ilwLcyms6BCyLn0z8J0+ZZmfpjwg9fRVZIR5/GMXd7r9RH94iDhld3UmSjBM6nXWM2TfZTQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.30.2.tgz",
      "integrity": "sha512-c2bH6xTrf4BDpK8MoGG4Bd6zAMZDAXS569UxCAGcA7IKbHNMlhGQ89eRmvpIUGfKWNVdbhSbkQaWhEoMGmGslA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.30.2.tgz",
      "integrity": "sha512-eVdpxh4wYcm0PofJIZVuYuLiqBIakQ9uFZmipf6LF/HRj5Bgm0eb3qL/mr1smyXIS1twwOxNWndd8z0E374hiA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.30.2.tgz",
      "integrity": "sha512-UK65WJAbwIJbiBFXpxrbTNArtfuznvxAJw4Q2ZGlU8kPeDIWEX1dg3rn2veBVUylA2Ezg89ktszWbaQnxD/e3A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.30.2.tgz",
      "integrity": "sha512-5Vh9dGeblpTxWHpOx8iauV02popZDsCYMPIgiuw97OJ5uaDsL86cnqSFs5LZkG3ghHoX5isLgWzMs+eD1YzrnA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.30.2.tgz",
      "integrity": "sha512-Cfd46gdmj1vQ+lR6VRTTadNHu6ALuw2pKR9lYq4FnhvgBc4zWY1EtZcAc6EffShbb1MFrIPfLDXD6Xprbnni4w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.30.2.tgz",
      "integrity": "sha512-XJaLUUFXb6/QG2lGIW6aIk6jKdtjtcffUT0NKvIqhSBY3hh9Ch+1LCeH80dR9q9LBjG3ewbDjnumefsLsP6aiA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.30.2.tgz",
      "integrity": "sha512-FZn+vaj7zLv//D/192WFFVA0RgHawIcHqLX9xuWiQt7P0PtdFEVaxgF9rjM/IRYHQXNnk61/H/gb2Ei+kUQ4xQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.30.2",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.30.2.tgz",
      "integrity": "sha512-5g1yc73p+iAkid5phb4oVFMB45417DkRevRbt/El/gKXJk4jid+vPFF/AXbxn05Aky8PapwzZrdJShv5C0avjw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minipass": {
      "version": "4.2.8",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-4.2.8.tgz",
      "integrity": "sha512-fNzuVyifolSLFL4NzpF+wEF4qrgqaaKX0haXPQEdQ7NKAN+WecoKMHV09YcuL/DHxrUsYQOK3MiuDf7Ip2OXfQ==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/minizlib": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/minizlib/-/minizlib-2.1.2.tgz",
      "integrity": "sha512-bAxsR8BVfj60DWXHE3u30oHzfl4G7khkSuPW+qvpd7jFRHm7dLxOjUk1EHACJ/hxLY8phGJ0YhYHZo7jil7Qdg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "minipass": "^3.0.0",
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/minizlib/node_modules/minipass": {
      "version": "3.3.6",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-3.3.6.tgz",
      "integrity": "sha512-DxiNidxSEK+tHG6zOIklvNOwm3hvCrbUrdtzY74U6HKTJxvIDfOUL5W5P2Ghd3DTkhhKPYGqeNUIh5qcM4YBfw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/minizlib/node_modules/yallist": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz",
      "integrity": "sha512-3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/mkdirp": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/mkdirp/-/mkdirp-1.0.4.tgz",
      "integrity": "sha512-vVqVZQyf3WLx2Shd0qJ9xuvqgAyKPLAiqITEtqW0oIUjzo3PePDd6fW9iFz30ef7Ysp/oiWqbhszeGWW2T6Gzw==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "mkdirp": "bin/cmd.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "3.3.11",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.11.tgz",
      "integrity": "sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/native-run": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/native-run/-/native-run-2.0.1.tgz",
      "integrity": "sha512-XfG1FBZLM50J10xH9361whJRC9SHZ0Bub4iNRhhI61C8Jv0e1ud19muex6sNKB51ibQNUJNuYn25MuYET/rE6w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ionic/utils-fs": "^3.1.7",
        "@ionic/utils-terminal": "^2.3.4",
        "bplist-parser": "^0.3.2",
        "debug": "^4.3.4",
        "elementtree": "^0.1.7",
        "ini": "^4.1.1",
        "plist": "^3.1.0",
        "split2": "^4.2.0",
        "through2": "^4.0.2",
        "tslib": "^2.6.2",
        "yauzl": "^2.10.0"
      },
      "bin": {
        "native-run": "bin/native-run"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/node-releases": {
      "version": "2.0.27",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.27.tgz",
      "integrity": "sha512-nmh3lCkYZ3grZvqcCH+fjmQ7X+H0OeZgP40OierEaAptX4XofMh5kwNbWh7lBduUzCcV/8kZ+NDLCwm2iorIlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/normalize-range": {
      "version": "0.1.2",
      "resolved": "https://registry.npmjs.org/normalize-range/-/normalize-range-0.1.2.tgz",
      "integrity": "sha512-bdok/XvKII3nUpklnV6P2hxtMNrCboOjAcyBuQnWEhO665FwrSNRxU+AqpsyvO6LgGYPspN+lu5CLtw4jPRKNA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/open": {
      "version": "8.4.2",
      "resolved": "https://registry.npmjs.org/open/-/open-8.4.2.tgz",
      "integrity": "sha512-7x81NCL719oNbsq/3mh+hVrAWmFuEYUqrq/Iw3kUzH8ReypT9QQ0BLoJS7/G9k6N81XjW4qHWtjWwe/9eLy1EQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-lazy-prop": "^2.0.0",
        "is-docker": "^2.1.1",
        "is-wsl": "^2.2.0"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-scurry": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-1.11.1.tgz",
      "integrity": "sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "lru-cache": "^10.2.0",
        "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0"
      },
      "engines": {
        "node": ">=16 || 14 >=14.18"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/path-scurry/node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/path-scurry/node_modules/minipass": {
      "version": "7.1.2",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.2.tgz",
      "integrity": "sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/pend": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/pend/-/pend-1.2.0.tgz",
      "integrity": "sha512-F3asv42UuXchdzt+xXqfW1OGlVBe+mxa2mqI0pg5yAHZPvFmY3Y6drSf/GQ1A86WgWEN9Kzh/WrgKa6iGcHXLg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.3.tgz",
      "integrity": "sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/plist": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/plist/-/plist-3.1.0.tgz",
      "integrity": "sha512-uysumyrvkUX0rX/dEVqt8gC3sTBzd4zoWfLeS29nb53imdaXVvLINYXTI2GNqzaMuvacNx4uJQ8+b3zXR0pkgQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@xmldom/xmldom": "^0.8.8",
        "base64-js": "^1.5.1",
        "xmlbuilder": "^15.1.1"
      },
      "engines": {
        "node": ">=10.4.0"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.6",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.6.tgz",
      "integrity": "sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "nanoid": "^3.3.11",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/prompts": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/prompts/-/prompts-2.4.2.tgz",
      "integrity": "sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "kleur": "^3.0.3",
        "sisteransi": "^1.0.5"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/prompts/node_modules/kleur": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/kleur/-/kleur-3.0.3.tgz",
      "integrity": "sha512-eTIzlVOSUR+JxdDFepEYcBMtZ9Qqdef+rnzWdRZuMbOywu5tO2w2N7rqjoANZ5k9vywhL6Br1VRjUIgTQx4E8w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/react": {
      "version": "19.2.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.2.0.tgz",
      "integrity": "sha512-tmbWg6W31tQLeB5cdIBOicJDJRR2KzXsV7uSK9iNfLWQ5bIZfxuPEHp7M8wiHyHnn0DD1i7w3Zmin0FtkrwoCQ==",
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.2.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.2.0.tgz",
      "integrity": "sha512-UlbRu4cAiGaIewkPyiRGJk0imDN2T3JjieT6spoL2UeSf5od4n5LB/mQ4ejmxhCFT1tYe8IvaFulzynWovsEFQ==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.27.0"
      },
      "peerDependencies": {
        "react": "^19.2.0"
      }
    },
    "node_modules/react-refresh": {
      "version": "0.18.0",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.18.0.tgz",
      "integrity": "sha512-QgT5//D3jfjJb6Gsjxv0Slpj23ip+HtOpnNgnb2S5zU3CB26G/IDPGoy4RJB42wzFE46DRsstbW6tKHoKbhAxw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/readable-stream": {
      "version": "3.6.2",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-3.6.2.tgz",
      "integrity": "sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.3",
        "string_decoder": "^1.1.1",
        "util-deprecate": "^1.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/rimraf": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/rimraf/-/rimraf-4.4.1.tgz",
      "integrity": "sha512-Gk8NlF062+T9CqNGn6h4tls3k6T1+/nXdOcSZVikNVtlRdYpA7wRJJMoXmuvOnLW844rPjdQ7JgXCYM6PPC/og==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "glob": "^9.2.0"
      },
      "bin": {
        "rimraf": "dist/cjs/src/bin.js"
      },
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/rollup": {
      "version": "4.53.3",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.53.3.tgz",
      "integrity": "sha512-w8GmOxZfBmKknvdXU1sdM9NHcoQejwF/4mNgj2JuEEdRaHwwF12K7e9eXn1nLZ07ad+du76mkVsyeb2rKGllsA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.8"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.53.3",
        "@rollup/rollup-android-arm64": "4.53.3",
        "@rollup/rollup-darwin-arm64": "4.53.3",
        "@rollup/rollup-darwin-x64": "4.53.3",
        "@rollup/rollup-freebsd-arm64": "4.53.3",
        "@rollup/rollup-freebsd-x64": "4.53.3",
        "@rollup/rollup-linux-arm-gnueabihf": "4.53.3",
        "@rollup/rollup-linux-arm-musleabihf": "4.53.3",
        "@rollup/rollup-linux-arm64-gnu": "4.53.3",
        "@rollup/rollup-linux-arm64-musl": "4.53.3",
        "@rollup/rollup-linux-loong64-gnu": "4.53.3",
        "@rollup/rollup-linux-ppc64-gnu": "4.53.3",
        "@rollup/rollup-linux-riscv64-gnu": "4.53.3",
        "@rollup/rollup-linux-riscv64-musl": "4.53.3",
        "@rollup/rollup-linux-s390x-gnu": "4.53.3",
        "@rollup/rollup-linux-x64-gnu": "4.53.3",
        "@rollup/rollup-linux-x64-musl": "4.53.3",
        "@rollup/rollup-openharmony-arm64": "4.53.3",
        "@rollup/rollup-win32-arm64-msvc": "4.53.3",
        "@rollup/rollup-win32-ia32-msvc": "4.53.3",
        "@rollup/rollup-win32-x64-gnu": "4.53.3",
        "@rollup/rollup-win32-x64-msvc": "4.53.3",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/sax": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/sax/-/sax-1.1.4.tgz",
      "integrity": "sha512-5f3k2PbGGp+YtKJjOItpg3P99IMD84E4HOvcfleTb5joCHNXYLsR9yWFPOYGgaeMPDubQILTCMdsFb2OMeOjtg==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/scheduler": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz",
      "integrity": "sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/signal-exit": {
      "version": "3.0.7",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-3.0.7.tgz",
      "integrity": "sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/sisteransi": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/sisteransi/-/sisteransi-1.0.5.tgz",
      "integrity": "sha512-bLGGlR1QxBcynn2d5YmDX4MGjlZvy2MRBDRNHLJ8VI6l6+9FUiyTFNJ0IveOSP0bcXgVDPRcfGqA0pjaqUpfVg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/slice-ansi": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/slice-ansi/-/slice-ansi-4.0.0.tgz",
      "integrity": "sha512-qMCMfhY040cVHT43K9BFygqYbUPFZKHOg7K73mtTWJRb8pyP3fzf4Ixd5SzdEJQ6MRUg/WBnOLxghZtKKurENQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "astral-regex": "^2.0.0",
        "is-fullwidth-code-point": "^3.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/slice-ansi?sponsor=1"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/split2": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/split2/-/split2-4.2.0.tgz",
      "integrity": "sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">= 10.x"
      }
    },
    "node_modules/string_decoder": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.3.0.tgz",
      "integrity": "sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.2.0"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/tailwindcss": {
      "version": "4.1.17",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.1.17.tgz",
      "integrity": "sha512-j9Ee2YjuQqYT9bbRTfTZht9W/ytp5H+jJpZKiYdP/bpnXARAuELt9ofP0lPnmHjbga7SNQIxdTAXCmtKVYjN+Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tapable": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.3.0.tgz",
      "integrity": "sha512-g9ljZiwki/LfxmQADO3dEY1CbpmXT5Hm2fJ+QaGKwSXUylMybePR7/67YW7jOrrvjEgL1Fmz5kzyAjWVWLlucg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/webpack"
      }
    },
    "node_modules/tar": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/tar/-/tar-6.2.1.tgz",
      "integrity": "sha512-DZ4yORTwrbTj/7MZYq2w+/ZFdI6OZ/f9SFHR+71gIVUZhOQPHzVCLpvRnPgyaMpfWxxk/4ONva3GQSyNIKRv6A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "chownr": "^2.0.0",
        "fs-minipass": "^2.0.0",
        "minipass": "^5.0.0",
        "minizlib": "^2.1.1",
        "mkdirp": "^1.0.3",
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/tar/node_modules/minipass": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-5.0.0.tgz",
      "integrity": "sha512-3FnjYuehv9k6ovOEbyOswadCDPX1piCfhV8ncmYtHOjuPwylVWsghTLo7rabjC3Rx5xD4HDx8Wm1xnMF7S5qFQ==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/tar/node_modules/yallist": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz",
      "integrity": "sha512-3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/through2": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/through2/-/through2-4.0.2.tgz",
      "integrity": "sha512-iOqSav00cVxEEICeD7TjLB1sueEL+81Wpzp2bY17uZjZN0pWZPuo4suZ/61VujxmqSGFfgOcNuTZ85QJwNZQpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "readable-stream": "3"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.15",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.15.tgz",
      "integrity": "sha512-j2Zq4NyQYG5XMST4cbs02Ak8iJUdxRM0XI5QyxXuZOzKOINmWurp3smXu3y5wDcJrptwpSjgXHzIQxR0omXljQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.3"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tree-kill": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/tree-kill/-/tree-kill-1.2.2.tgz",
      "integrity": "sha512-L0Orpi8qGpRG//Nd+H90vFB+3iHnue1zSSGmNOOCh1GLJ7rUKVwV2HvijphGQS2UmhUZewS9VgvxYIdgr+fG1A==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "tree-kill": "cli.js"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/undici-types": {
      "version": "7.16.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.16.0.tgz",
      "integrity": "sha512-Zz+aZWSj8LE6zoxD+xrjh4VfkIG8Ya6LvYkZqtUQGJPZjYl53ypCaUwWqo7eI0x66KBGeRo+mlBEkMSeSZ38Nw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/universalify": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/universalify/-/universalify-2.0.1.tgz",
      "integrity": "sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 10.0.0"
      }
    },
    "node_modules/untildify": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/untildify/-/untildify-4.0.0.tgz",
      "integrity": "sha512-KK8xQ1mkzZeg9inewmFVDNkg3l5LUhoq9kN6iWYB/CC9YMG8HA+c1Q8HwDe6dEX7kErrEVNVBO3fWsVq5iDgtw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.1.4.tgz",
      "integrity": "sha512-q0SPT4xyU84saUX+tomz1WLkxUbuaJnR1xWt17M7fJtEJigJeWUNGUqrauFXsHnqev9y9JTRGwk13tFBuKby4A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/vite": {
      "version": "7.2.6",
      "resolved": "https://registry.npmjs.org/vite/-/vite-7.2.6.tgz",
      "integrity": "sha512-tI2l/nFHC5rLh7+5+o7QjKjSR04ivXDF4jcgV0f/bTQ+OJiITy5S6gaynVsEM+7RqzufMnVbIon6Sr5x1SDYaQ==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "esbuild": "^0.25.0",
        "fdir": "^6.5.0",
        "picomatch": "^4.0.3",
        "postcss": "^8.5.6",
        "rollup": "^4.43.0",
        "tinyglobby": "^0.2.15"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "lightningcss": "^1.21.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/xml2js": {
      "version": "0.5.0",
      "resolved": "https://registry.npmjs.org/xml2js/-/xml2js-0.5.0.tgz",
      "integrity": "sha512-drPFnkQJik/O+uPKpqSgr22mpuFHqKdbS835iAQrUC73L2F5WkboIRd63ai/2Yg6I1jzifPFKH2NTK+cfglkIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "sax": ">=0.6.0",
        "xmlbuilder": "~11.0.0"
      },
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/xml2js/node_modules/xmlbuilder": {
      "version": "11.0.1",
      "resolved": "https://registry.npmjs.org/xmlbuilder/-/xmlbuilder-11.0.1.tgz",
      "integrity": "sha512-fDlsI/kFEx7gLvbecc0/ohLG50fugQp8ryHzMTuW9vSa1GJ0XYWKnhsUx7oie3G98+r56aTQIUB4kht42R3JvA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/xmlbuilder": {
      "version": "15.1.1",
      "resolved": "https://registry.npmjs.org/xmlbuilder/-/xmlbuilder-15.1.1.tgz",
      "integrity": "sha512-yMqGBqtXyeN1e3TGYvgNgDVZ3j84W4cwkOXQswghol6APgZWaff9lnbvN7MHYJOiXsvGPXtjTYJEiC9J2wv9Eg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/yauzl": {
      "version": "2.10.0",
      "resolved": "https://registry.npmjs.org/yauzl/-/yauzl-2.10.0.tgz",
      "integrity": "sha512-p4a9I6X6nu6IhoGmBqAcbJy1mlC4j27vEPZX9F4L4/vZT3Lyq1VkFHw/V/PUcB9Buo+DG3iHkT0x3Qya58zc3g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "buffer-crc32": "~0.2.3",
        "fd-slicer": "~1.1.0"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "4.1.13",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.1.13.tgz",
      "integrity": "sha512-AvvthqfqrAhNH9dnfmrfKzX5upOdjUVJYFqNSlkmGf64gRaTzlPwz99IHYnVs28qYAybvAlBV+H7pn0saFY4Ig==",
      "dev": true,
      "license": "MIT",
      "peer": true,
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/zod-validation-error": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/zod-validation-error/-/zod-validation-error-4.0.2.tgz",
      "integrity": "sha512-Q6/nZLe6jxuU80qb/4uJ4t5v2VEZ44lzQjPDhYJNztRQ4wyWc6VF3D3Kb/fAuPetZQnhS3hnajCf9CsWesghLQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "zod": "^3.25.0 || ^4.0.0"
      }
    }
  }
}
\n```\n\n### client/package.json\n\n```json\n{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor/app": "^6.0.3",
    "@capacitor/browser": "^6.0.6",
    "@capacitor/core": "^6.2.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@capacitor/android": "^6.2.1",
    "@capacitor/cli": "^6.2.1",
    "@eslint/js": "^9.39.1",
    "@tailwindcss/postcss": "^4.1.17",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.22",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.17",
    "vite": "^7.2.4"
  }
}
\n```\n\n### client/postcss.config.js\n\n```js\nexport default {
    plugins: {
        '@tailwindcss/postcss': {},
        autoprefixer: {},
    },
}
\n```\n\n### client/public/manifest.json\n\n```json\n{
    "name": "PWA-TorServe",
    "short_name": "TorServe",
    "description": "Home Media Server Client",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#111827",
    "theme_color": "#2563eb",
    "icons": [
        {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}\n```\n\n### client/src/App.css\n\n```css\n#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
\n```\n\n### client/src/App.jsx\n\n```jsx\nimport { useState, useEffect } from 'react'
import { registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Register Custom Java Bridge
const TVPlayer = registerPlugin('TVPlayer')

const TMDB_API_KEY = 'c3bec60e67fabf42dd2202281dcbc9a7'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const cleanTitle = (rawName) => {
  if (!rawName) return ''

  // 1. Initial cleanup: dots, underscores, brackets
  let name = rawName
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()

  // 2. Cut off at Year (e.g. "Movie Title 2023 ...")
  const yearMatch = name.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) {
    const index = name.indexOf(yearMatch[0])
    name = name.substring(0, index)
  }

  // 3. Remove technical/garbage tags
  const tags = [
    '1080p', '720p', '2160p', '4k', 'WEB-DL', 'WEBRip', 'BluRay', 'HDR',
    'H.264', 'x264', 'HEVC', 'AAC', 'AC3', 'DTS', 'HDTV',
    'rus', 'eng', 'torrent', 'stream', 'dub', 'sub'
  ]

  // Find the earliest occurrence of a tag and cut
  let cutoff = name.length
  const lowerName = name.toLowerCase()
  tags.forEach(tag => {
    // Match strict word boundary so we don't cut "stream" in "Mainstream"
    // actually user asked to remove "stream", usually these are separated by spaces after dot replacement
    const idx = lowerName.indexOf(tag.toLowerCase())
    if (idx !== -1 && idx < cutoff) {
      cutoff = idx
    }
  })

  return name.substring(0, cutoff)
    .replace(/[^\w\s\u0400-\u04FF]/g, '') // remove weird symbols
    .replace(/\s+/g, ' ')
    .trim()
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

// Format file size
const formatSize = (bytes) => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

// Format download speed
const formatSpeed = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec < 1024) return ''
  const kbps = bytesPerSec / 1024
  if (kbps < 1024) return `${kbps.toFixed(0)} KB/s`
  return `${(kbps / 1024).toFixed(1)} MB/s`
}

const Poster = ({ name, onClick, progress, peers, isReady, size, downloadSpeed }) => {
  const [bgImage, setBgImage] = useState(null)
  const cleanedName = cleanTitle(name)

  // Gradient generator for fallback (Beautiful Offline UI)
  const getGradient = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    const h1 = Math.abs(hash % 360)
    const h2 = Math.abs((hash * 13) % 360)
    return `linear-gradient(135deg, hsl(${h1}, 70%, 20%), hsl(${h2}, 80%, 15%))`
  }

  useEffect(() => {
    if (!cleanedName) return

    const cacheKey = `poster_v3_${cleanedName}` // Bump cache version
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setBgImage(cached)
      return
    }

    const fetchPoster = async () => {
      try {
        const TMDB_API_KEY = 'c3bec60e67fabf42dd2202281dcbc9a7'
        let result = null

        // 1. Try Client-Side Search (Bypass Server)
        // We use api.allorigins.win to avoid CORS issues and bypass local blocking
        try {
          const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedName)}&language=ru-RU`
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(tmdbUrl)}`

          console.log('[Poster] Client Search:', proxyUrl)
          const res = await fetch(proxyUrl)
          if (res.ok) {
            const data = await res.json()
            result = data.results?.find(r => r.poster_path)
          }
        } catch (e) {
          console.warn('[Poster] Client Search Failed:', e)
        }

        // 2. Fallback to Server (only if client search failed, though server is likely offline)
        if (!result) {
          let baseUrl = ''
          if (Capacitor.isNativePlatform()) {
            baseUrl = localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000'
          }
          baseUrl = baseUrl.replace(/\/$/, '')
          const apiUrl = `${baseUrl}/api/tmdb/search?query=${encodeURIComponent(cleanedName)}`
          console.log('[Poster] Fetching Meta (Server Fallback):', apiUrl) // Added console log for clarity
          const res = await fetch(apiUrl)
          if (res.ok) {
            const data = await res.json()
            result = data.results?.find(r => r.poster_path)
          }
        }

        // 3. If we found a poster (either way), show it via wsrv.nl
        if (result) {
          const directUrl = `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w500${result.poster_path}&output=webp`
          localStorage.setItem(cacheKey, directUrl)
          setBgImage(directUrl)
        }
      } catch (err) {
        console.warn('Poster Fetch Fail:', err)
      }
    }

    fetchPoster()
  }, [cleanedName])

  return (
    <button
      onClick={onClick}
      className={`
          relative group aspect-[2/3] rounded-xl overflow-hidden shadow-xl
          transition-all duration-300
          focus:scale-105 focus:ring-4 focus:ring-blue-500 focus:z-20 outline-none
          hover:scale-105
          bg-gray-800
        `}
      style={{ background: !bgImage ? getGradient(name) : undefined }}
    >
      {/* If we have an image, show it. Otherwise show decorative gradient elements. */}
      {bgImage ? (
        <img
          src={bgImage}
          alt={name}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={() => setBgImage(null)} // Revert to gradient on load error
        />
      ) : (
        <>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 -left-10 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <h3 className="text-gray-100 font-bold text-lg leading-snug drop-shadow-lg line-clamp-4 font-sans tracking-wide">
              {cleanedName || name}
            </h3>
          </div>
        </>
      )}

      {/* Overlay for Stats */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 flex flex-col justify-end p-3 text-left">
        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isReady ? (
            <span className="bg-green-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">READY</span>
          ) : (
            <span className="bg-yellow-500 text-black text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">{Math.round(progress * 100)}%</span>
          )}
        </div>

        {/* Footer Stats */}
        <div className="text-xs text-gray-400 flex items-center gap-2 mt-auto">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
            {peers}
          </span>
          {size > 0 && (
            <span className="text-gray-500">{formatSize(size)}</span>
          )}
          {downloadSpeed > 0 && (
            <span className="text-green-400">↓{formatSpeed(downloadSpeed)}</span>
          )}
          {!isReady && (
            <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div style={{ width: `${progress * 100}%` }} className="h-full bg-blue-500" />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

const DegradedBanner = ({ lastStateChange }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!lastStateChange) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastStateChange) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastStateChange])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="bg-yellow-600/90 text-yellow-100 p-4 rounded-lg mb-6 border border-yellow-500 animate-pulse mx-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❄️</span>
        <div>
          <div className="font-bold text-lg">Cooling Down</div>
          <div className="text-sm opacity-90">
            High memory usage detected. Service may be slower.
            <span className="ml-2 font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const ErrorScreen = ({ status, retryAfter, onRetry }) => {
  const [countdown, setCountdown] = useState(retryAfter || 300)

  useEffect(() => {
    if (countdown <= 0) {
      onRetry()
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, onRetry])

  const isCircuitOpen = status === 'circuit_open'
  const icon = isCircuitOpen ? '🔌' : '⚠️'
  const title = isCircuitOpen ? 'Storage Unavailable' : 'Server Error'
  const message = isCircuitOpen
    ? 'NFS/Storage is not responding. The server will retry automatically.'
    : 'A critical error occurred. Please wait for recovery.'

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <h1 className="text-2xl font-bold text-red-400 mb-2">{title}</h1>
        <p className="text-gray-300 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
        >
          Retry Now
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

function App() {
  // Constants
  const PLAYERS = [
    { id: 'net.gtvbox.videoplayer', name: 'Vimu Player (Рекомендуем)' },
    { id: 'org.videolan.vlc', name: 'VLC for Android' },
    { id: 'com.mxtech.videoplayer.ad', name: 'MX Player' },
    { id: '', name: 'System Chooser (Спрашивать всегда)' }
  ];

  // State
  const [serverUrl, setServerUrl] = useState(() => {
    if (Capacitor.isNativePlatform()) {
      return localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000'
    }
    return ''
  })

  const [preferredPlayer, setPreferredPlayer] = useState(
    localStorage.getItem('preferredPlayer') || 'net.gtvbox.videoplayer'
  )

  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showServerInput, setShowServerInput] = useState(false)
  const [selectedTorrent, setSelectedTorrent] = useState(null)

  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  // New: Sorting & Categories
  const [sortBy, setSortBy] = useState(localStorage.getItem('sortBy') || 'name')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [buffering, setBuffering] = useState(null) // { name, progress }

  // New: RuTracker Search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Categories definition
  const CATEGORIES = [
    { id: 'all', name: 'Все', icon: '📚' },
    { id: 'movie', name: 'Фильмы', icon: '🎬' },
    { id: 'series', name: 'Сериалы', icon: '📺' },
    { id: 'music', name: 'Музыка', icon: '🎵' },
    { id: 'other', name: 'Другое', icon: '📁' }
  ]

  // Auto-detect category based on files
  const getCategory = (torrent) => {
    const files = torrent.files || []
    const videos = files.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name))
    const audio = files.filter(f => /\.(mp3|flac|m4a|ogg|wav)$/i.test(f.name))

    if (audio.length > 0 && videos.length === 0) return 'music'
    if (videos.length > 1) return 'series'
    if (videos.length === 1) return 'movie'
    return 'other'
  }

  // Filter and sort torrents
  const getFilteredAndSortedTorrents = () => {
    let result = [...torrents]

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(t => getCategory(t) === categoryFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '')
        case 'size':
          const sizeA = a.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0
          const sizeB = b.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0
          return sizeB - sizeA
        case 'peers': return (b.numPeers || 0) - (a.numPeers || 0)
        default: return 0
      }
    })

    return result
  }

  const displayTorrents = getFilteredAndSortedTorrents()

  const savePreferredPlayer = (playerId) => {
    setPreferredPlayer(playerId)
    localStorage.setItem('preferredPlayer', playerId)
  }

  const saveSortBy = (sort) => {
    setSortBy(sort)
    localStorage.setItem('sortBy', sort)
  }

  const saveServerUrl = (url) => {
    setServerUrl(url)
    localStorage.setItem('serverUrl', url)
    setShowSettings(false)
    fetchStatus()
  }

  const getApiUrl = (path) => {
    if (serverUrl) {
      const base = serverUrl.replace(/\/$/, '')
      return `${base}${path}`
    }
    return path
  }

  const fetchStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/status'))
      if (res.status === 503) {
        setRetryAfter(300)
      }
      const data = await res.json()
      setServerStatus(data.serverStatus || 'ok')
      setLastStateChange(data.lastStateChange || null)
      setTorrents(data.torrents || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching status:', err)
      if (torrents.length === 0) {
        setError(`Connection Error: ${err.message}`)
      }
    }
  }

  // Effect: Polling
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [serverUrl])

  // Effect: Magnet Handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handleAppUrlOpen = async (event) => {
      if (event.url?.startsWith('magnet:')) {
        addMagnet(event.url)
      }
    }
    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)
    return () => CapacitorApp.removeAllListeners()
  }, [serverUrl])

  // Logic: Add Torrent
  const addMagnet = async (magnetLink) => {
    if (!magnetLink) return
    setLoading(true)
    try {
      await fetch(getApiUrl('/api/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: magnetLink })
      })
      setMagnet('')
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addTorrent = (e) => {
    e.preventDefault()
    addMagnet(magnet)
  }

  // Logic: RuTracker Search
  const searchRuTracker = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch(getApiUrl(`/api/rutracker/search?query=${encodeURIComponent(searchQuery)}`))
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch (err) {
      console.error('[Search] Error:', err)
      setError('Ошибка поиска: ' + err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  const addFromSearch = async (magnetOrId, title) => {
    setSearchLoading(true)
    try {
      // Jacred returns magnet directly in search results
      if (magnetOrId && magnetOrId.startsWith('magnet:')) {
        await addMagnet(magnetOrId)
        setShowSearch(false)
        setSearchResults([])
        setSearchQuery('')
      } else {
        // Fallback: try to get magnet via API
        const res = await fetch(getApiUrl(`/api/rutracker/magnet/${encodeURIComponent(magnetOrId)}`))
        const data = await res.json()
        if (data.magnet) {
          await addMagnet(data.magnet)
          setShowSearch(false)
          setSearchResults([])
          setSearchQuery('')
        } else {
          setError('Не удалось получить magnet-ссылку')
        }
      }
    } catch (err) {
      setError('Ошибка: ' + err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  // ─── Hardware Back Button & Keyboard Handling ───
  useEffect(() => {
    const handleBack = () => {
      if (selectedTorrent) {
        setSelectedTorrent(null)
      } else if (showSettings) {
        setShowSettings(false)
      } else {
        // Use exitApp instead of minimize for better TV UX
        CapacitorApp.exitApp()
      }
    }

    const backListener = CapacitorApp.addListener('backButton', () => {
      console.log('Native Back Button')
      handleBack()
    })

    const keyListener = (e) => {
      // 27=Esc, 8=Backspace, 10009=TV Back
      if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009) {
        handleBack()
      }
    }
    window.addEventListener('keydown', keyListener)

    return () => {
      backListener.then(h => h.remove())
      window.removeEventListener('keydown', keyListener)
    }
  }, [selectedTorrent, showSettings])

  const deleteTorrent = async (infoHash) => {
    if (!confirm('Remove this torrent?')) return
    try {
      await fetch(getApiUrl(`/api/delete/${infoHash}`), { method: 'DELETE' })
      setSelectedTorrent(null)
      fetchStatus()
    } catch (err) {
      alert('Delete failed')
    }
  }

  const getStreamUrl = (infoHash, fileIndex) => {
    if (serverUrl) {
      return `${serverUrl.replace(/\/$/, '')}/stream/${infoHash}/${fileIndex}`
    }
    return `${window.location.protocol}//${window.location.host}/stream/${infoHash}/${fileIndex}`
  }

  // Logic: Play single file
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    const title = cleanTitle(fileName)
    const pkg = preferredPlayer

    console.log(`[Play] URL: ${streamUrl} | Package: ${pkg} | Title: ${title}`)

    // Check if selected player is installed (skip for system chooser)
    if (pkg && Capacitor.isNativePlatform()) {
      try {
        const { installed } = await TVPlayer.isPackageInstalled({ package: pkg })
        if (!installed) {
          const playerName = PLAYERS.find(p => p.id === pkg)?.name || pkg
          alert(`${playerName} не установлен. Выберите другой плеер в настройках.`)
          return
        }
      } catch (e) {
        console.warn('[Play] isPackageInstalled check failed:', e)
      }
    }

    // Show buffering banner
    setBuffering({ name: title, progress: 10 })
    setSelectedTorrent(null) // Close modal

    try {
      await TVPlayer.play({ url: streamUrl, package: pkg, title: title })
      setBuffering(null)
    } catch (e) {
      console.error(`[Play] Failed with ${pkg}, trying system chooser...`)
      try {
        await TVPlayer.play({ url: streamUrl, package: "", title: title })
        setBuffering(null)
      } catch (err) {
        setBuffering(null)
        alert("Error launching player: " + err.message)
      }
    }
  }

  // Logic: Play All (playlist for series)
  const handlePlayAll = async (torrent, startIndex = 0) => {
    const videoFiles = torrent.files?.filter(f =>
      /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)
    ) || []

    if (videoFiles.length <= 1) {
      // Single file, use normal play
      const file = videoFiles[0] || torrent.files?.[0]
      if (file) handlePlay(torrent.infoHash, file.index, file.name)
      return
    }

    const pkg = preferredPlayer
    const title = cleanTitle(torrent.name)
    const urls = videoFiles.map(f => getStreamUrl(torrent.infoHash, f.index))
    const names = videoFiles.map(f => cleanTitle(f.name) || f.name)

    console.log(`[PlayAll] ${urls.length} files | Package: ${pkg}`)

    // Check if selected player is installed
    if (pkg && Capacitor.isNativePlatform()) {
      try {
        const { installed } = await TVPlayer.isPackageInstalled({ package: pkg })
        if (!installed) {
          const playerName = PLAYERS.find(p => p.id === pkg)?.name || pkg
          alert(`${playerName} не установлен. Выберите другой плеер в настройках.`)
          return
        }
      } catch (e) {
        console.warn('[PlayAll] isPackageInstalled check failed:', e)
      }
    }

    // Show buffering banner
    setBuffering({ name: `${title} (${urls.length} files)`, progress: 10 })
    setSelectedTorrent(null) // Close modal

    try {
      await TVPlayer.playList({
        package: pkg,
        title: title,
        urls: urls,
        names: names,
        startIndex: startIndex
      })
      setBuffering(null)
    } catch (e) {
      console.error('[PlayAll] Playlist failed, falling back to single play:', e)
      setBuffering(null)
      handlePlay(torrent.infoHash, videoFiles[startIndex]?.index || 0, videoFiles[startIndex]?.name)
    }
  }

  const copyUrl = (infoHash, fileIndex) => {
    const url = getStreamUrl(infoHash, fileIndex)
    navigator.clipboard?.writeText(url)
      .then(() => alert('URL copied!'))
      .catch(() => alert('Failed to copy'))
  }

  // Render: Critical Error
  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return <ErrorScreen status={serverStatus} retryAfter={retryAfter} onRetry={fetchStatus} />
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-red-500 selection:text-white pb-20">

      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          PWA-TorServe
        </h1>
        <div className="flex gap-4">
          <button onClick={fetchStatus} className="p-2 hover:bg-gray-800 rounded-full transition-colors">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">⚙️</button>
        </div>
      </div>

      {/* Status Banner */}
      {serverStatus === 'degraded' && <DegradedBanner lastStateChange={lastStateChange} />}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mx-6 mb-6 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl animate-fade-in relative z-20">
          <h2 className="text-xl font-bold mb-4 text-gray-200">Settings</h2>

          <div className="mb-6">
            <label className="text-gray-400 text-sm mb-3 block">Default Video Player</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLAYERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => savePreferredPlayer(p.id)}
                  className={`
                    p-4 rounded-lg border text-left transition-all
                    ${preferredPlayer === p.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-[1.02]'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
                  `}
                >
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs opacity-75 mt-1">{p.id || 'System Default'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={() => setShowServerInput(!showServerInput)}
              className="text-gray-500 text-sm hover:text-white flex items-center gap-2"
            >
              {showServerInput ? '▼' : '▶'} Advanced: Server Connection
            </button>

            {showServerInput && (
              <div className="mt-3 animate-fade-in">
                <label className="text-gray-400 text-sm mb-2 block">Server URL</label>
                <div className="flex gap-2">
                  <input
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    onBlur={e => saveServerUrl(e.target.value)}
                    placeholder="http://192.168.1.70:3000"
                    className="bg-gray-800 text-white px-4 py-2 rounded flex-1 border border-gray-700 focus:border-blue-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Change only if moving to a new server IP.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="px-6 py-4">
        {/* Add Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-200">My List</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
            >
              🔍 Поиск
            </button>
            {!showServerInput && (
              <button
                onClick={() => setShowServerInput(true)}
                className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-600 transition-transform hover:scale-105"
              >
                + Magnet
              </button>
            )}
          </div>
        </div>

        {/* RuTracker Search Panel */}
        {showSearch && (
          <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50 animate-fade-in">
            <div className="flex gap-2 mb-4">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchRuTracker()}
                placeholder="Поиск на RuTracker..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                autoFocus
              />
              <button
                onClick={searchRuTracker}
                disabled={searchLoading}
                className="bg-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
              >
                {searchLoading ? '...' : '🔍'}
              </button>
              <button
                onClick={() => { setShowSearch(false); setSearchResults([]) }}
                className="bg-gray-800 px-4 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{r.title}</div>
                      <div className="text-xs text-gray-400 flex gap-3 mt-1">
                        <span>📀 {r.size}</span>
                        <span className="text-green-400">⬆ {r.seeders}</span>
                        {r.tracker && <span className="text-purple-400">{r.tracker}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => addFromSearch(r.magnet || r.id, r.title)}
                      disabled={searchLoading}
                      className="ml-3 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-bold disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchLoading && (
              <div className="text-center text-gray-400 py-4">
                <span className="animate-pulse">Поиск...</span>
              </div>
            )}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-3 pt-1 px-1 -mx-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#141414] focus:outline-none
                ${categoryFilter === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
              `}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Sort Buttons */}
        <div className="flex gap-2 mb-6 text-xs px-1 -mx-1">
          <span className="text-gray-500 self-center">Сортировка:</span>
          {[{ id: 'name', label: 'Имя' }, { id: 'size', label: 'Размер' }, { id: 'peers', label: 'Пиры' }].map(s => (
            <button
              key={s.id}
              onClick={() => saveSortBy(s.id)}
              className={`
                px-3 py-1 rounded transition-all
                focus:ring-2 focus:ring-blue-400 focus:outline-none
                ${sortBy === s.id
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800/50 text-gray-500 hover:text-white'}
              `}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        {showServerInput && (
          <form onSubmit={addTorrent} className="mb-8 flex gap-2 animate-fade-in">
            <input
              value={magnet}
              onChange={e => setMagnet(e.target.value)}
              placeholder="Paste magnet link..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <button disabled={loading} className="bg-blue-600 px-6 py-3 rounded-lg font-bold">
              {loading ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowServerInput(false)} className="bg-gray-800 px-4 rounded-lg">✕</button>
          </form>
        )}

        {error && <div className="bg-red-900/50 text-red-200 p-4 rounded-lg mb-6 border border-red-800">{error}</div>}

        {/* The GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayTorrents.map(t => (
            <Poster
              key={t.infoHash}
              name={t.name}
              progress={t.progress}
              peers={t.numPeers}
              size={t.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0}
              downloadSpeed={t.downloadSpeed || 0}
              isReady={t.progress >= 1 || t.files?.length > 0}
              onClick={() => setSelectedTorrent(t)}
            />
          ))}

          {displayTorrents.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-600">
              <div className="text-6xl mb-4">{categoryFilter === 'all' ? '🍿' : CATEGORIES.find(c => c.id === categoryFilter)?.icon}</div>
              <p className="text-lg">{categoryFilter === 'all' ? 'Your list is empty.' : 'Нет торрентов в этой категории'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedTorrent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedTorrent(null)}>
          <div className="bg-[#181818] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="h-32 bg-gradient-to-br from-blue-900 to-gray-900 p-6 flex items-end relative">
              <button onClick={() => setSelectedTorrent(null)} className="absolute top-4 right-4 bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition-colors">✕</button>
              <h2 className="text-2xl font-bold leading-tight shadow-black drop-shadow-lg line-clamp-2">{cleanTitle(selectedTorrent.name)}</h2>
            </div>

            <div className="p-6">
              <div className="text-sm text-gray-400 mb-6 font-mono break-all text-xs border-l-2 border-gray-700 pl-3">
                {selectedTorrent.name}
              </div>

              <div className="space-y-3">
                {/* Play button */}
                <button
                  autoFocus
                  onClick={() => {
                    const video = selectedTorrent.files?.find(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || selectedTorrent.files?.[0]
                    if (video) handlePlay(selectedTorrent.infoHash, video.index, video.name)
                    else alert("No video files recognized")
                  }}
                  className="w-full bg-white text-black py-4 rounded font-bold hover:bg-gray-200 focus:bg-yellow-400 text-lg transition-colors flex items-center justify-center gap-2"
                >
                  ▶ Play
                </button>

                {/* Play All button - only show if multiple video files */}
                {selectedTorrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)).length > 1 && (
                  <button
                    onClick={() => handlePlayAll(selectedTorrent)}
                    className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 focus:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    📺 Play All ({selectedTorrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)).length} episodes)
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const video = selectedTorrent.files?.[0]
                      if (video) copyUrl(selectedTorrent.infoHash, video.index)
                    }}
                    className="flex-1 bg-gray-800 text-gray-300 py-3 rounded font-medium hover:bg-gray-700"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => deleteTorrent(selectedTorrent.infoHash)}
                    className="flex-1 bg-gray-800 text-red-400 py-3 rounded font-medium hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buffering Overlay */}
      {buffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-xl font-bold text-white mb-2">Буферизация...</h2>
            <p className="text-gray-400">{buffering.name}</p>
            <div className="mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${buffering.progress || 10}%` }}
              />
            </div>
            <button
              onClick={() => setBuffering(null)}
              className="mt-6 text-gray-500 hover:text-white"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
\n```\n\n### client/src/index.css\n\n```css\n@import "tailwindcss";

/* ─────────────────────────────────────────────────────────────
   PWA-TorServe - TV-First Design System
   ───────────────────────────────────────────────────────────── */

/* Prevent horizontal overflow */
html,
body {
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
}

#root {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

/* ─────────────────────────────────────────────────────────────
   TV Focus States (D-Pad Navigation)
   ───────────────────────────────────────────────────────────── */

/* Remove default focus outline */
*:focus {
  outline: none;
}

/* TV-Friendly Focus Ring */
.tv-focusable:focus,
.tv-card:focus,
button:focus,
[tabindex]:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8);
  transform: scale(1.02);
  transition: all 0.15s ease-out;
}

/* Card Focus - Netflix Style */
.tv-card {
  transition: all 0.2s ease-out;
  cursor: pointer;
}

.tv-card:focus {
  transform: scale(1.08);
  box-shadow: 0 0 0 4px white, 0 8px 30px rgba(0, 0, 0, 0.5);
  z-index: 10;
  position: relative;
}

.tv-card:hover {
  transform: scale(1.05);
}

/* Primary Button Focus */
.tv-btn-primary:focus {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.8), 0 4px 20px rgba(34, 197, 94, 0.4);
}

/* Danger Button Focus */
.tv-btn-danger:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.8);
}

/* ─────────────────────────────────────────────────────────────
   Netflix Grid Layout
   ───────────────────────────────────────────────────────────── */

.netflix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}

/* Larger cards on TV (big screens) */
@media (min-width: 1280px) {
  .netflix-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    padding: 2rem;
  }
}

/* ─────────────────────────────────────────────────────────────
   Torrent Card
   ───────────────────────────────────────────────────────────── */

.torrent-card {
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.torrent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  opacity: 0;
  transition: opacity 0.2s;
}

.torrent-card:focus::before,
.torrent-card:hover::before {
  opacity: 1;
}

.torrent-card-title {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.torrent-card-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #94a3b8;
}

.torrent-card-progress {
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.torrent-card-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Ready state - green glow */
.torrent-card.ready {
  border-color: #22c55e;
}

.torrent-card.ready::before {
  background: #22c55e;
  opacity: 1;
}

/* ─────────────────────────────────────────────────────────────
   Details Modal (Full Screen on TV)
   ───────────────────────────────────────────────────────────── */

.details-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.details-modal {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 24px;
  padding: 3rem;
  max-width: 700px;
  width: 90%;
  text-align: center;
  border: 1px solid #334155;
}

.details-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.details-progress-container {
  margin: 2rem 0;
}

.details-progress-bar {
  height: 12px;
  background: #334155;
  border-radius: 6px;
  overflow: hidden;
}

.details-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.details-status {
  font-size: 1.25rem;
  margin-top: 0.75rem;
}

.details-status.ready {
  color: #22c55e;
}

.details-status.loading {
  color: #fbbf24;
}

.details-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2.5rem;
}

.details-btn-watch {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  padding: 1.25rem 2rem;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.details-btn-watch:focus {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.6), 0 8px 30px rgba(34, 197, 94, 0.3);
}

.details-btn-delete {
  background: transparent;
  color: #ef4444;
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.details-btn-delete:focus {
  background: #ef4444;
  color: white;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.5);
}

.details-back {
  margin-top: 2rem;
  font-size: 0.875rem;
  color: #64748b;
}

/* ─────────────────────────────────────────────────────────────
   Mobile Optimizations
   ───────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .netflix-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }

  .torrent-card {
    aspect-ratio: auto;
    padding: 1rem;
  }

  .details-modal {
    padding: 2.5rem;
    /* Larger padding */
    border-radius: 24px;
    max-width: 95%;
    /* Use more screen width */
    border: 2px solid #475569;
  }

  .details-title {
    font-size: 2rem;
    /* Larger title */
    margin-bottom: 2rem;
  }

  .details-progress-bar {
    height: 20px;
    /* Thicker bar */
  }

  .details-btn-watch {
    font-size: 1.75rem;
    /* Hugo watch button */
    padding: 1.5rem 3rem;
    width: 100%;
    /* Full width */
    margin-bottom: 1rem;
  }

  .details-btn-delete {
    font-size: 1.25rem;
    padding: 1.25rem;
    width: 100%;
  }

  .details-back {
    font-size: 1.25rem;
    /* Larger hint */
    margin-top: 2rem;
    opacity: 0.8;
  }
}

/* ─────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────── */

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Removed pulse-ready animation to prevent visual conflict with focus state */

/* ─────────────────────────────────────────────────────────────
   Header & Settings
   ───────────────────────────────────────────────────────────── */

.header-btn:focus {
  transform: scale(1.2);
  color: white;
}

.settings-panel {
  max-width: 500px;
  margin: 0 auto 2rem;
}\n```\n\n### client/src/main.jsx\n\n```jsx\nimport { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
\n```\n\n### client/tailwind.config.js\n\n```js\n/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
\n```\n\n### client/vite.config.js\n\n```js\nimport { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
\n```\n\n### data/db.json\n\n```json\n{
  "serverStatus": "ok",
  "lastStateChange": 1765019655635,
  "storageFailures": 0,
  "progress": {}
}\n```\n\n### db.json\n\n```json\n{
  "serverStatus": "circuit_open",
  "lastStateChange": 1764948027727,
  "storageFailures": 4,
  "progress": {}
}\n```\n\n### package-lock.json\n\n```json\n{
  "name": "pwa-torserve",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "pwa-torserve",
      "version": "1.0.0",
      "dependencies": {
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "express": "^4.18.2",
        "lowdb": "^7.0.1",
        "torrent-stream": "^1.2.0"
      }
    },
    "node_modules/accepts": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-1.3.8.tgz",
      "integrity": "sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "~2.1.34",
        "negotiator": "0.6.3"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/array-flatten": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/array-flatten/-/array-flatten-1.1.1.tgz",
      "integrity": "sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg==",
      "license": "MIT"
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "license": "MIT"
    },
    "node_modules/bn.js": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/bn.js/-/bn.js-4.12.2.tgz",
      "integrity": "sha512-n4DSx829VRTRByMRGdjQ9iqsN0Bh4OolPsFnaZBLcbi8iXcB+kJ9s7EnRt4wILZNV3kPLHkRVfOc/HvhC3ovDw==",
      "license": "MIT"
    },
    "node_modules/bncode": {
      "version": "0.5.3",
      "resolved": "https://registry.npmjs.org/bncode/-/bncode-0.5.3.tgz",
      "integrity": "sha512-0P5VuWobU5Gwbeio8n9Jsdv0tE1IikrV9n4f7RsnXHNtxmdd/oeIO6QyoSEUAEyo5P6i3XMfBppi82WqNsT4JA=="
    },
    "node_modules/body-parser": {
      "version": "1.20.4",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-1.20.4.tgz",
      "integrity": "sha512-ZTgYYLMOXY9qKU/57FAo8F+HA2dGX7bqGc71txDRC1rS4frdFI5R7NhluHxH6M0YItAP0sHB4uqAOcYKxO6uGA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "content-type": "~1.0.5",
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "~1.2.0",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.4.24",
        "on-finished": "~2.4.1",
        "qs": "~6.14.0",
        "raw-body": "~2.5.3",
        "type-is": "~1.6.18",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/buffer-alloc": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/buffer-alloc/-/buffer-alloc-1.2.0.tgz",
      "integrity": "sha512-CFsHQgjtW1UChdXgbyJGtnm+O/uLQeZdtbDo8mfUgYXCHSM1wgrVxXm6bSyrUuErEb+4sYVGCzASBRot7zyrow==",
      "license": "MIT",
      "dependencies": {
        "buffer-alloc-unsafe": "^1.1.0",
        "buffer-fill": "^1.0.0"
      }
    },
    "node_modules/buffer-alloc-unsafe": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/buffer-alloc-unsafe/-/buffer-alloc-unsafe-1.1.0.tgz",
      "integrity": "sha512-TEM2iMIEQdJ2yjPJoSIsldnleVaAk1oW3DBVUykyOLsEsFmEc9kn+SFFPz+gl54KQNxlDnAwCXosOS9Okx2xAg==",
      "license": "MIT"
    },
    "node_modules/buffer-equal": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/buffer-equal/-/buffer-equal-0.0.1.tgz",
      "integrity": "sha512-RgSV6InVQ9ODPdLWJ5UAqBqJBOg370Nz6ZQtRzpt6nUjc8v0St97uJ4PYC6NztqIScrAXafKM3mZPMygSe1ggA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/buffer-equals": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/buffer-equals/-/buffer-equals-1.0.4.tgz",
      "integrity": "sha512-99MsCq0j5+RhubVEtKQgKaD6EM+UP3xJgIvQqwJ3SOLDUekzxMX1ylXBng+Wa2sh7mGT0W6RUly8ojjr1Tt6nA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/buffer-fill": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/buffer-fill/-/buffer-fill-1.0.0.tgz",
      "integrity": "sha512-T7zexNBwiiaCOGDg9xNX9PBmjrubblRkENuptryuI64URkXDFum9il/JGL8Lm8wYfAXpredVXXZz7eMHilimiQ==",
      "license": "MIT"
    },
    "node_modules/buffer-from": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/buffer-from/-/buffer-from-1.1.2.tgz",
      "integrity": "sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==",
      "license": "MIT"
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/chrome-dgram": {
      "version": "3.0.6",
      "resolved": "https://registry.npmjs.org/chrome-dgram/-/chrome-dgram-3.0.6.tgz",
      "integrity": "sha512-bqBsUuaOiXiqxXt/zA/jukNJJ4oaOtc7ciwqJpZVEaaXwwxqgI2/ZdG02vXYWUhHGziDlvGMQWk0qObgJwVYKA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.4",
        "run-series": "^1.1.9"
      }
    },
    "node_modules/chrome-dns": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/chrome-dns/-/chrome-dns-1.0.1.tgz",
      "integrity": "sha512-HqsYJgIc8ljJJOqOzLphjAs79EUuWSX3nzZi2LNkzlw3GIzAeZbaSektC8iT/tKvLqZq8yl1GJu5o6doA4TRbg==",
      "license": "MIT",
      "dependencies": {
        "chrome-net": "^3.3.2"
      }
    },
    "node_modules/chrome-net": {
      "version": "3.3.4",
      "resolved": "https://registry.npmjs.org/chrome-net/-/chrome-net-3.3.4.tgz",
      "integrity": "sha512-Jzy2EnzmE+ligqIZUsmWnck9RBXLuUy6CaKyuNMtowFG3ZvLt8d+WBJCTPEludV0DHpIKjAOlwjFmTaEdfdWCw==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.1"
      }
    },
    "node_modules/compact2string": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/compact2string/-/compact2string-1.4.1.tgz",
      "integrity": "sha512-3D+EY5nsRhqnOwDxveBv5T8wGo4DEvYxjDtPGmdOX+gfr5gE92c2RC0w2wa+xEefm07QuVqqcF3nZJUZ92l/og==",
      "license": "BSD",
      "dependencies": {
        "ipaddr.js": ">= 0.1.5"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "license": "MIT"
    },
    "node_modules/content-disposition": {
      "version": "0.5.4",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-0.5.4.tgz",
      "integrity": "sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "5.2.1"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-signature": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.0.7.tgz",
      "integrity": "sha512-NXdYc3dLr47pBkpUCHtKSwIOQXLVn8dZEuywboCOJY/osA0wFSLlSawr3KN8qXJEyX66FcONTH8EIlVuK0yyFA==",
      "license": "MIT"
    },
    "node_modules/core-util-is": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/core-util-is/-/core-util-is-1.0.3.tgz",
      "integrity": "sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==",
      "license": "MIT"
    },
    "node_modules/cors": {
      "version": "2.8.5",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.5.tgz",
      "integrity": "sha512-KIHbLJqu73RGr/hnbrO9uBeixNGuvSQjul/jdFvS/KFSIH1hWVd1ng7zOHx+YrEfInLG7q4n6GHQ9cDtxv/P6g==",
      "license": "MIT",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/cyclist": {
      "version": "0.1.1",
      "resolved": "https://registry.npmjs.org/cyclist/-/cyclist-0.1.1.tgz",
      "integrity": "sha512-w8a8nQk9YSCkMmH2wDbFqpH1XMz7l409mSvWnnG6Iu6D0Ydhvq61XASE7QIaA46FxfG2Ag524ZuGgAy2cXPfsw=="
    },
    "node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/destroy": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/destroy/-/destroy-1.2.0.tgz",
      "integrity": "sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/dotenv": {
      "version": "16.6.1",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-16.6.1.tgz",
      "integrity": "sha512-uBq4egWHTcTt33a72vpSG0z3HnPuIl6NqYcTrKEg2azoEyl2hpW0zqlxysq2pK9HlDIHyHyakeYaYnSAwd8bow==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==",
      "license": "MIT"
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz",
      "integrity": "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==",
      "license": "MIT"
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/events": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/events/-/events-3.3.0.tgz",
      "integrity": "sha512-mQw+2fkQbALzQ7V0MY0IqdnXNOeTtP4r0lN9z7AAawCXgqea7bDii20AYrIBrFd/Hx0M2Ocz6S111CaFkUcb0Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.8.x"
      }
    },
    "node_modules/express": {
      "version": "4.22.0",
      "resolved": "https://registry.npmjs.org/express/-/express-4.22.0.tgz",
      "integrity": "sha512-c2iPh3xp5vvCLgaHK03+mWLFPhox7j1LwyxcZwFVApEv5i0X+IjPpbT50SJJwwLpdBVfp45AkK/v+AFgv/XlfQ==",
      "license": "MIT",
      "dependencies": {
        "accepts": "~1.3.8",
        "array-flatten": "1.1.1",
        "body-parser": "~1.20.3",
        "content-disposition": "~0.5.4",
        "content-type": "~1.0.4",
        "cookie": "~0.7.1",
        "cookie-signature": "~1.0.6",
        "debug": "2.6.9",
        "depd": "2.0.0",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "finalhandler": "~1.3.1",
        "fresh": "~0.5.2",
        "http-errors": "~2.0.0",
        "merge-descriptors": "1.0.3",
        "methods": "~1.1.2",
        "on-finished": "~2.4.1",
        "parseurl": "~1.3.3",
        "path-to-regexp": "~0.1.12",
        "proxy-addr": "~2.0.7",
        "qs": "~6.14.0",
        "range-parser": "~1.2.1",
        "safe-buffer": "5.2.1",
        "send": "~0.19.0",
        "serve-static": "~1.16.2",
        "setprototypeof": "1.2.0",
        "statuses": "~2.0.1",
        "type-is": "~1.6.18",
        "utils-merge": "1.0.1",
        "vary": "~1.1.2"
      },
      "engines": {
        "node": ">= 0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/fifo": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/fifo/-/fifo-0.1.4.tgz",
      "integrity": "sha512-CpKgwraLo4YWY9cUEICNJ1WcOVR2WE1Jvot3Nvr7FGBiGOKgkn1CmF4zuCl9VxvEh1nQsdYXtQg+V0etPiED6g==",
      "license": "MIT"
    },
    "node_modules/finalhandler": {
      "version": "1.3.2",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-1.3.2.tgz",
      "integrity": "sha512-aA4RyPcd3badbdABGDuTXCMTtOneUCAYH/gxoYRTZlIJdF0YPWuGqiAsIrhNnnqdXGswYk6dGujem4w80UJFhg==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "on-finished": "~2.4.1",
        "parseurl": "~1.3.3",
        "statuses": "~2.0.2",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/flatten": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/flatten/-/flatten-0.0.1.tgz",
      "integrity": "sha512-pzNZh42/A2HmcRIpddSP0T+zBofd119o5rNB2u1YHv36CM2C/ietI2ZsjWZ2LSL7J0BNVkFn1a9Ad+cmO2lDQg==",
      "deprecated": "flatten is deprecated in favor of utility frameworks such as lodash.",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fresh": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-0.5.2.tgz",
      "integrity": "sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fs.realpath": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/fs.realpath/-/fs.realpath-1.0.0.tgz",
      "integrity": "sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==",
      "license": "ISC"
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-browser-rtc": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/get-browser-rtc/-/get-browser-rtc-1.1.0.tgz",
      "integrity": "sha512-MghbMJ61EJrRsDe7w1Bvqt3ZsBuqhce5nrn/XAwgwOXhcsz53/ltdxOse1h/8eKXj5slzxdsz56g5rzOFSGwfQ==",
      "license": "MIT"
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/glob": {
      "version": "7.2.3",
      "resolved": "https://registry.npmjs.org/glob/-/glob-7.2.3.tgz",
      "integrity": "sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==",
      "deprecated": "Glob versions prior to v9 are no longer supported",
      "license": "ISC",
      "dependencies": {
        "fs.realpath": "^1.0.0",
        "inflight": "^1.0.4",
        "inherits": "2",
        "minimatch": "^3.1.1",
        "once": "^1.3.0",
        "path-is-absolute": "^1.0.0"
      },
      "engines": {
        "node": "*"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/hat": {
      "version": "0.0.3",
      "resolved": "https://registry.npmjs.org/hat/-/hat-0.0.3.tgz",
      "integrity": "sha512-zpImx2GoKXy42fVDSEad2BPKuSQdLcqsCYa48K3zHSzM/ugWuYjLDr8IXxpVuL7uCLHw56eaiLxCRthhOzf5ug==",
      "license": "MIT/X11",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.4.24",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.4.24.tgz",
      "integrity": "sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==",
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/inflight": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/inflight/-/inflight-1.0.6.tgz",
      "integrity": "sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==",
      "deprecated": "This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.",
      "license": "ISC",
      "dependencies": {
        "once": "^1.3.0",
        "wrappy": "1"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/isarray": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-0.0.1.tgz",
      "integrity": "sha512-D2S+3GLxWH+uhrNEcoh/fnmYeP8E8/zHl644d/jdA0g2uyXvy3sb0qxotE+ne0LtccHknQzWwZEzhak7oJ0COQ==",
      "license": "MIT"
    },
    "node_modules/k-rpc-socket": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/k-rpc-socket/-/k-rpc-socket-1.11.1.tgz",
      "integrity": "sha512-8xtA8oqbZ6v1Niryp2/g4GxW16EQh5MvrUylQoOG+zcrDff5CKttON2XUXvMwlIHq4/2zfPVFiinAccJ+WhxoA==",
      "license": "MIT",
      "dependencies": {
        "bencode": "^2.0.0",
        "chrome-dgram": "^3.0.2",
        "chrome-dns": "^1.0.0",
        "chrome-net": "^3.3.2"
      }
    },
    "node_modules/k-rpc-socket/node_modules/bencode": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/bencode/-/bencode-2.0.3.tgz",
      "integrity": "sha512-D/vrAD4dLVX23NalHwb8dSvsUsxeRPO8Y7ToKA015JQYq69MLDOMkC0uGZYA/MPpltLO8rt8eqFC2j8DxjTZ/w==",
      "license": "MIT"
    },
    "node_modules/lowdb": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/lowdb/-/lowdb-7.0.1.tgz",
      "integrity": "sha512-neJAj8GwF0e8EpycYIDFqEPcx9Qz4GUho20jWFR7YiFeXzF1YMLdxB36PypcTSPMA+4+LvgyMacYhlr18Zlymw==",
      "license": "MIT",
      "dependencies": {
        "steno": "^4.0.2"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/typicode"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-0.3.0.tgz",
      "integrity": "sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/merge-descriptors": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-1.0.3.tgz",
      "integrity": "sha512-gaNvAS7TZ897/rVaZ0nMtAyxNyi/pdbjbAwUpFQpN70GqnVfOiXpeUUMKRBmzXaSQ8DdTX4/0ms62r2K+hE6mQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/methods": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/methods/-/methods-1.1.2.tgz",
      "integrity": "sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/mime/-/mime-1.6.0.tgz",
      "integrity": "sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==",
      "license": "MIT",
      "bin": {
        "mime": "cli.js"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/mkdirp": {
      "version": "0.3.5",
      "resolved": "https://registry.npmjs.org/mkdirp/-/mkdirp-0.3.5.tgz",
      "integrity": "sha512-8OCq0De/h9ZxseqzCH8Kw/Filf5pF/vMI6+BH7Lu0jXz2pqYCjTAQRolSxRIi+Ax+oCCjlxoJMP0YQ4XlrQNHg==",
      "deprecated": "Legacy versions of mkdirp are no longer supported. Please update to mkdirp 1.x. (Note that the API surface has changed to use Promises in 1.x.)",
      "license": "MIT"
    },
    "node_modules/mkdirp-classic": {
      "version": "0.5.3",
      "resolved": "https://registry.npmjs.org/mkdirp-classic/-/mkdirp-classic-0.5.3.tgz",
      "integrity": "sha512-gKLcREMhtuZRwRAfqP3RFW+TK4JqApVBtOIftVgjuABpAtpxhPGaDcfvbhNvD0B8iD1oUr/txX35NjcaY6Ns/A==",
      "license": "MIT"
    },
    "node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/negotiator": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.3.tgz",
      "integrity": "sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.1.tgz",
      "integrity": "sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/options": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/options/-/options-0.0.6.tgz",
      "integrity": "sha512-bOj3L1ypm++N+n7CEbbe473A414AB7z+amKYshRb//iuL3MpdDCLhPnw6aVTdKB9g5ZRVHIEp8eUln6L2NUStg==",
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/parse-torrent-file": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/parse-torrent-file/-/parse-torrent-file-2.1.4.tgz",
      "integrity": "sha512-u2MgLOjZPDDer1oRg1c+H/+54iIQYY5TKgQ5G8KrGLT1Dcwdo7Lj+QfQR123+u8J0AMSFGbQUvsBlSB7uIJcCA==",
      "deprecated": "Use the parse-torrent package instead",
      "license": "MIT",
      "dependencies": {
        "bencode": "^0.7.0",
        "simple-sha1": "^2.0.0"
      },
      "bin": {
        "parse-torrent-file": "bin/cmd.js"
      }
    },
    "node_modules/parse-torrent-file/node_modules/bencode": {
      "version": "0.7.0",
      "resolved": "https://registry.npmjs.org/bencode/-/bencode-0.7.0.tgz",
      "integrity": "sha512-MG5AM/hkQIZoz/layZ1JK3xBTfqkLcJ3dJ7u2lx+6vZT1JWyK3OgEFGx1WFzWt6grGH6OSGQvRcCnhWKLp4f1Q==",
      "license": "MIT"
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-is-absolute": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/path-is-absolute/-/path-is-absolute-1.0.1.tgz",
      "integrity": "sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/path-to-regexp": {
      "version": "0.1.12",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-0.1.12.tgz",
      "integrity": "sha512-RA1GjUVMnvYFxuqovrEqZoxxW5NUZqbwKtYz/Tt7nXerk0LbLblQmrsgdeOxV5SFHf0UDggjS/bSeOZwt1pmEQ==",
      "license": "MIT"
    },
    "node_modules/peer-wire-protocol": {
      "version": "0.7.1",
      "resolved": "https://registry.npmjs.org/peer-wire-protocol/-/peer-wire-protocol-0.7.1.tgz",
      "integrity": "sha512-V9oTa/ZcfNNz9fAST28Gg0fXbPeFPk3SBImsYO8GDDG5D0E195vxXmjZ+SPrzr4BJyMQmdDmwUfTf9MZ62z4mw==",
      "dependencies": {
        "bitfield": "^0.1.0",
        "bncode": "^0.2.3",
        "buffer-alloc": "^1.1.0",
        "buffer-from": "^1.0.0",
        "readable-stream": "^1.0.2",
        "speedometer": "^0.1.2"
      }
    },
    "node_modules/peer-wire-protocol/node_modules/bitfield": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/bitfield/-/bitfield-0.1.0.tgz",
      "integrity": "sha512-M15ypXCxXd81FSOWL2ejHpB1TDKmz7Y55/VuqfExJi72sHW0JzE5dfV+hrSZafZtWRg/tdMsdte5dgwrlOM7nA==",
      "license": "-"
    },
    "node_modules/peer-wire-protocol/node_modules/bncode": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/bncode/-/bncode-0.2.3.tgz",
      "integrity": "sha512-IXGfySD68R/J2X/it8GZqAM+Vb3ByZvAlUi0Gysq4ZACq6hXGQ3YshKo0QS/f3S9wOWKjJnEjP6x3ELxqBnAOA=="
    },
    "node_modules/peer-wire-protocol/node_modules/readable-stream": {
      "version": "1.1.14",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-1.1.14.tgz",
      "integrity": "sha512-+MeVjFf4L44XUkhM1eYbD8fyEsxcV81pqMSR5gblfcLCHfZvbrqy4/qYHE+/R5HoBUT11WV5O08Cr1n3YXkWVQ==",
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.1",
        "isarray": "0.0.1",
        "string_decoder": "~0.10.x"
      }
    },
    "node_modules/peer-wire-protocol/node_modules/string_decoder": {
      "version": "0.10.31",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-0.10.31.tgz",
      "integrity": "sha512-ev2QzSzWPYmy9GuqfIVildA4OdcGLeFZQrq5ys6RtiuF+RQQiZWr8TZNyAcuVXyQRYfEO+MsoB/1BuQVhOJuoQ==",
      "license": "MIT"
    },
    "node_modules/peer-wire-swarm": {
      "version": "0.12.2",
      "resolved": "https://registry.npmjs.org/peer-wire-swarm/-/peer-wire-swarm-0.12.2.tgz",
      "integrity": "sha512-sIWZ1nTL9l6mI9J18kW1AeByBwagvNzGJlMmQA9pM+otKQtTIwnigK8SR0nEFrNZYqZelI6RQ6g4udvtQ2TI1g==",
      "dependencies": {
        "buffer-from": "^1.0.0",
        "fifo": "^0.1.4",
        "once": "^1.1.1",
        "peer-wire-protocol": "^0.7.0",
        "speedometer": "^0.1.2",
        "utp": "0.0.7"
      }
    },
    "node_modules/process-nextick-args": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/process-nextick-args/-/process-nextick-args-2.0.1.tgz",
      "integrity": "sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==",
      "license": "MIT"
    },
    "node_modules/proxy-addr": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.7.tgz",
      "integrity": "sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==",
      "license": "MIT",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/qs": {
      "version": "6.14.0",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.14.0.tgz",
      "integrity": "sha512-YWWTjgABSKcvs/nWBi9PycY/JiPJqOD4JA6o9Sej2AtvSGarXxKC3OQSk4pAarbdQlKAh5D4FCQkJNkW+GAn3w==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/queue-tick": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/queue-tick/-/queue-tick-1.0.1.tgz",
      "integrity": "sha512-kJt5qhMxoszgU/62PLP1CJytzd2NKetjSRnyuj31fDd3Rlcz3fzlFdFLD1SItunPwyqEOkca6GbV612BWfaBag==",
      "license": "MIT"
    },
    "node_modules/random-iterate": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/random-iterate/-/random-iterate-1.0.1.tgz",
      "integrity": "sha512-Jdsdnezu913Ot8qgKgSgs63XkAjEsnMcS1z+cC6D6TNXsUXsMxy0RpclF2pzGZTEiTXL9BiArdGTEexcv4nqcA==",
      "license": "MIT"
    },
    "node_modules/randombytes": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/randombytes/-/randombytes-2.1.0.tgz",
      "integrity": "sha512-vYl3iOX+4CKUWuxGi9Ukhie6fsqXqS9FE2Zaic4tNFD2N2QQaXOMFbuKK4QmDHC0JO6B1Zp41J0LpT0oR68amQ==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "^5.1.0"
      }
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "2.5.3",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-2.5.3.tgz",
      "integrity": "sha512-s4VSOf6yN0rvbRZGxs8Om5CWj6seneMwK3oDb4lWDH0UPhWcxwOWw5+qk24bxq87szX1ydrwylIOp2uG1ojUpA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.4.24",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/re-emitter": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/re-emitter/-/re-emitter-1.1.4.tgz",
      "integrity": "sha512-C0SIXdXDSus2yqqvV7qifnb4NoWP7mEBXJq3axci301mXHCZb8Djwm4hrEZo4UeXRaEnfjH98uQ8EBppk2oNWA==",
      "license": "MIT"
    },
    "node_modules/rimraf": {
      "version": "2.7.1",
      "resolved": "https://registry.npmjs.org/rimraf/-/rimraf-2.7.1.tgz",
      "integrity": "sha512-uWjbaKIK3T1OSVptzX7Nl6PvQ3qAGtKEtVRjRuazjfL3Bx5eI409VZSqgND+4UNnmzLVdPj9FqFJNPqBZFve4w==",
      "deprecated": "Rimraf versions prior to v4 are no longer supported",
      "license": "ISC",
      "dependencies": {
        "glob": "^7.1.3"
      },
      "bin": {
        "rimraf": "bin.js"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/run-series": {
      "version": "1.1.9",
      "resolved": "https://registry.npmjs.org/run-series/-/run-series-1.1.9.tgz",
      "integrity": "sha512-Arc4hUN896vjkqCYrUXquBFtRZdv1PfLbTYP71efP6butxyQ0kWpiNJyAgsxscmQg1cqvHY32/UCBzXedTpU2g==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/rusha": {
      "version": "0.8.14",
      "resolved": "https://registry.npmjs.org/rusha/-/rusha-0.8.14.tgz",
      "integrity": "sha512-cLgakCUf6PedEu15t8kbsjnwIFFR2D4RfL+W3iWFJ4iac7z4B0ZI8fxy4R3J956kAI68HclCFGL8MPoUVC3qVA==",
      "license": "MIT"
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "license": "MIT"
    },
    "node_modules/send": {
      "version": "0.19.1",
      "resolved": "https://registry.npmjs.org/send/-/send-0.19.1.tgz",
      "integrity": "sha512-p4rRk4f23ynFEfcD9LA0xRYngj+IyGiEYyqqOak8kaN0TvNmuxC2dcVeBn62GpCeR2CpWqyHCNScTP91QbAVFg==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "1.2.0",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "fresh": "0.5.2",
        "http-errors": "2.0.0",
        "mime": "1.6.0",
        "ms": "2.1.3",
        "on-finished": "2.4.1",
        "range-parser": "~1.2.1",
        "statuses": "2.0.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/send/node_modules/http-errors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.0.tgz",
      "integrity": "sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "2.0.0",
        "inherits": "2.0.4",
        "setprototypeof": "1.2.0",
        "statuses": "2.0.1",
        "toidentifier": "1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/send/node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/send/node_modules/statuses": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.1.tgz",
      "integrity": "sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/serve-static": {
      "version": "1.16.2",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-1.16.2.tgz",
      "integrity": "sha512-VqpjJZKadQB/PEbEwvFdO43Ax5dFBZ2UECszz8bQ7pi7wt//PWe1P6MN7eCnjsatYtBT6EuiClbjSWP2WrIoTw==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "parseurl": "~1.3.3",
        "send": "0.19.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/serve-static/node_modules/http-errors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.0.tgz",
      "integrity": "sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "2.0.0",
        "inherits": "2.0.4",
        "setprototypeof": "1.2.0",
        "statuses": "2.0.1",
        "toidentifier": "1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/serve-static/node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/serve-static/node_modules/send": {
      "version": "0.19.0",
      "resolved": "https://registry.npmjs.org/send/-/send-0.19.0.tgz",
      "integrity": "sha512-dW41u5VfLXu8SJh5bwRmyYUbAoSB3c9uQh6L8h/KtsFREPWpbX1lrljJo186Jc4nmci/sGUZ9a0a0J2zgfq2hw==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "1.2.0",
        "encodeurl": "~1.0.2",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "fresh": "0.5.2",
        "http-errors": "2.0.0",
        "mime": "1.6.0",
        "ms": "2.1.3",
        "on-finished": "2.4.1",
        "range-parser": "~1.2.1",
        "statuses": "2.0.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/serve-static/node_modules/send/node_modules/encodeurl": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-1.0.2.tgz",
      "integrity": "sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/serve-static/node_modules/statuses": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.1.tgz",
      "integrity": "sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==",
      "license": "ISC"
    },
    "node_modules/side-channel": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.0.tgz",
      "integrity": "sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3",
        "side-channel-list": "^1.0.0",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.0.tgz",
      "integrity": "sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/simple-concat": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/simple-concat/-/simple-concat-1.0.1.tgz",
      "integrity": "sha512-cSFtAPtRhljv69IK0hTVZQ+OfE9nePi/rtJmw5UjHeVyVroEqJXP1sFztKUy1qU+xvz3u/sfYJLa947b7nAN2Q==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/simple-peer": {
      "version": "6.4.4",
      "resolved": "https://registry.npmjs.org/simple-peer/-/simple-peer-6.4.4.tgz",
      "integrity": "sha512-sY35UHankz0ba02Dd8YzdyXhEeTAnW6ZUyDfKOSwUht1GLp9VuMT4jQUXF/wG7C9vpwvitV7Ig7a6IkY/qizwg==",
      "license": "MIT",
      "dependencies": {
        "debug": "^2.1.0",
        "get-browser-rtc": "^1.0.0",
        "inherits": "^2.0.1",
        "randombytes": "^2.0.3",
        "readable-stream": "^2.0.5"
      }
    },
    "node_modules/simple-peer/node_modules/isarray": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-1.0.0.tgz",
      "integrity": "sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==",
      "license": "MIT"
    },
    "node_modules/simple-peer/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/simple-peer/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "license": "MIT"
    },
    "node_modules/simple-peer/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/simple-sha1": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/simple-sha1/-/simple-sha1-2.1.2.tgz",
      "integrity": "sha512-TQl9rm4rdKAVmhO++sXAb8TNN0D6JAD5iyI1mqEPNpxUzTRrtm4aOG1pDf/5W/qCFihiaoK6uuL9rvQz1x1VKw==",
      "license": "MIT",
      "dependencies": {
        "rusha": "^0.8.1"
      }
    },
    "node_modules/simple-websocket": {
      "version": "4.3.1",
      "resolved": "https://registry.npmjs.org/simple-websocket/-/simple-websocket-4.3.1.tgz",
      "integrity": "sha512-knEO6ub2Pw00c7ueOV6snKE1hr7jIdY068+239v0I8DVKofyd7IQmYHXrM9pZL1zuI0H7sd+Y5kedndBi5GXIA==",
      "license": "MIT",
      "dependencies": {
        "debug": "^2.1.3",
        "inherits": "^2.0.1",
        "randombytes": "^2.0.3",
        "readable-stream": "^2.0.5",
        "ws": "^2.0.0",
        "xtend": "^4.0.1"
      }
    },
    "node_modules/simple-websocket/node_modules/isarray": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-1.0.0.tgz",
      "integrity": "sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==",
      "license": "MIT"
    },
    "node_modules/simple-websocket/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/simple-websocket/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "license": "MIT"
    },
    "node_modules/simple-websocket/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/simple-websocket/node_modules/ws": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/ws/-/ws-2.3.1.tgz",
      "integrity": "sha512-61a+9LgtYZxTq1hAonhX8Xwpo2riK4IOR/BIVxioFbCfc3QFKmpE4x9dLExfLHKtUfVZigYa36tThVhO57erEw==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.0.1",
        "ultron": "~1.1.0"
      }
    },
    "node_modules/simple-websocket/node_modules/ws/node_modules/safe-buffer": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.0.1.tgz",
      "integrity": "sha512-cr7dZWLwOeaFBLTIuZeYdkfO7UzGIKhjYENJFAxUOMKWGaWDm2nJM2rzxNRm5Owu0DH3ApwNo6kx5idXZfb/Iw==",
      "license": "MIT"
    },
    "node_modules/speedometer": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/speedometer/-/speedometer-0.1.4.tgz",
      "integrity": "sha512-phdEoDlA6EUIVtzwq1UiNMXDUogczp204aYF/yfOhjNePWFfIpBJ1k5wLMuXQhEOOMjuTJEcc4vdZa+vuP+n/Q=="
    },
    "node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/steno": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/steno/-/steno-4.0.2.tgz",
      "integrity": "sha512-yhPIQXjrlt1xv7dyPQg2P17URmXbuM5pdGkpiMB3RenprfiBlvK415Lctfe0eshk90oA7/tNq7WEiMK8RSP39A==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/typicode"
      }
    },
    "node_modules/thirty-two": {
      "version": "0.0.2",
      "resolved": "https://registry.npmjs.org/thirty-two/-/thirty-two-0.0.2.tgz",
      "integrity": "sha512-0j1A9eqbP8dSEtkqqEJGpYFN2lPgQR1d0qKS2KNAmIxkK6gV37D5hRa5b/mYzVL1fyAVWBkeUDIXybZdCLVBzA==",
      "engines": {
        "node": ">=0.2.6"
      }
    },
    "node_modules/thunky": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/thunky/-/thunky-1.1.0.tgz",
      "integrity": "sha512-eHY7nBftgThBqOyHGVN+l8gF0BucP09fMo0oO/Lb0w1OF80dJv+lDVpXG60WMQvkcxAkNybKsrEIE3ZtKGmPrA==",
      "license": "MIT"
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/torrent-stream": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/torrent-stream/-/torrent-stream-1.2.1.tgz",
      "integrity": "sha512-F+3tYmXnpO2gyhZQ7o8yakELJH3FtKISI/FU0iWvchOWFUXiFnjbEBoumSzfcK1P71Qxzx2az4lVK4Dkq4KSew==",
      "dependencies": {
        "bitfield": "^0.1.0",
        "bncode": "^0.5.2",
        "buffer-from": "^1.0.0",
        "end-of-stream": "^0.1.4",
        "fs-chunk-store": "^1.3.0",
        "hat": "0.0.3",
        "immediate-chunk-store": "^1.0.5",
        "ip-set": "^1.0.0",
        "mkdirp": "^0.3.5",
        "parse-torrent": "^4.0.0",
        "peer-wire-swarm": "^0.12.0",
        "rimraf": "^2.2.5",
        "torrent-discovery": "^5.2.0",
        "torrent-piece": "^1.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/addr-to-ip-port": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/addr-to-ip-port/-/addr-to-ip-port-1.5.4.tgz",
      "integrity": "sha512-ByxmJgv8vjmDcl3IDToxL2yrWFrRtFpZAToY0f46XFXl8zS081t7El5MXIodwm7RC6DhHBRoOSMLFSPKCtHukg==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/bencode": {
      "version": "0.7.0",
      "resolved": "https://registry.npmjs.org/bencode/-/bencode-0.7.0.tgz",
      "integrity": "sha512-MG5AM/hkQIZoz/layZ1JK3xBTfqkLcJ3dJ7u2lx+6vZT1JWyK3OgEFGx1WFzWt6grGH6OSGQvRcCnhWKLp4f1Q==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/bitfield": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/bitfield/-/bitfield-0.1.0.tgz",
      "integrity": "sha512-M15ypXCxXd81FSOWL2ejHpB1TDKmz7Y55/VuqfExJi72sHW0JzE5dfV+hrSZafZtWRg/tdMsdte5dgwrlOM7nA==",
      "license": "-"
    },
    "node_modules/torrent-stream/node_modules/bittorrent-dht": {
      "version": "6.4.2",
      "resolved": "https://registry.npmjs.org/bittorrent-dht/-/bittorrent-dht-6.4.2.tgz",
      "integrity": "sha512-DeBunF1nL/ckThYyU3AVtHFR195zNV06Ob6bKNXA1y6X56GSKMfkNCABB45YcbZevGMW1dytFlm59D/fws5lTg==",
      "license": "MIT",
      "dependencies": {
        "bencode": "^0.7.0",
        "buffer-equals": "^1.0.3",
        "debug": "^2.2.0",
        "inherits": "^2.0.1",
        "k-bucket": "^0.6.0",
        "k-rpc": "^3.6.0",
        "lru": "^2.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/bittorrent-tracker": {
      "version": "7.7.0",
      "resolved": "https://registry.npmjs.org/bittorrent-tracker/-/bittorrent-tracker-7.7.0.tgz",
      "integrity": "sha512-YFgPTVRhUMncZr8tM3ige7gnViMGhKoGF23qaiISRG8xtYebTGHrMSMXsTXo6O1KbtdEI+4jzvGY1K/wdT9GUA==",
      "license": "MIT",
      "dependencies": {
        "bencode": "^0.8.0",
        "bn.js": "^4.4.0",
        "compact2string": "^1.2.0",
        "debug": "^2.0.0",
        "hat": "0.0.3",
        "inherits": "^2.0.1",
        "ip": "^1.0.1",
        "minimist": "^1.1.1",
        "once": "^1.3.0",
        "random-iterate": "^1.0.1",
        "run-parallel": "^1.1.2",
        "run-series": "^1.0.2",
        "simple-get": "^2.0.0",
        "simple-peer": "^6.0.0",
        "simple-websocket": "^4.0.0",
        "string2compact": "^1.1.1",
        "uniq": "^1.0.1",
        "ws": "^1.0.0",
        "xtend": "^4.0.0"
      },
      "bin": {
        "bittorrent-tracker": "bin/cmd.js"
      }
    },
    "node_modules/torrent-stream/node_modules/bittorrent-tracker/node_modules/bencode": {
      "version": "0.8.0",
      "resolved": "https://registry.npmjs.org/bencode/-/bencode-0.8.0.tgz",
      "integrity": "sha512-MWs3FqaWOGg5l+quIT9JTx7+SlcMbfPqqpWy+GOYi5rjZkX8i03tkNhAQn3pD2GAKENPpP3ScUR97ZUMffhHZA==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/decompress-response": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/decompress-response/-/decompress-response-3.3.0.tgz",
      "integrity": "sha512-BzRPQuY1ip+qDonAOz42gRm/pg9F768C+npV/4JOsxRC2sq+Rlk+Q4ZCAsOhnIaMrgarILY+RMUIvMmmX1qAEA==",
      "license": "MIT",
      "dependencies": {
        "mimic-response": "^1.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/torrent-stream/node_modules/end-of-stream": {
      "version": "0.1.5",
      "resolved": "https://registry.npmjs.org/end-of-stream/-/end-of-stream-0.1.5.tgz",
      "integrity": "sha512-go5TQkd0YRXYhX+Lc3UrXkoKU5j+m72jEP5lHWr2Nh82L8wfZtH8toKgcg4T10o23ELIMGXQdwCbl+qAXIPDrw==",
      "license": "MIT",
      "dependencies": {
        "once": "~1.3.0"
      }
    },
    "node_modules/torrent-stream/node_modules/fs-chunk-store": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/fs-chunk-store/-/fs-chunk-store-1.7.0.tgz",
      "integrity": "sha512-KhjJmZAs2eqfhCb6PdPx4RcZtheGTz86tpTC5JTvqBn/xda+Nb+0C7dCyjOSN7T76H6a56LvH0SVXQMchLXDRw==",
      "license": "MIT",
      "dependencies": {
        "mkdirp": "^0.5.1",
        "random-access-file": "^2.0.1",
        "randombytes": "^2.0.3",
        "rimraf": "^2.4.2",
        "run-parallel": "^1.1.2",
        "thunky": "^1.0.1"
      }
    },
    "node_modules/torrent-stream/node_modules/fs-chunk-store/node_modules/mkdirp": {
      "version": "0.5.6",
      "resolved": "https://registry.npmjs.org/mkdirp/-/mkdirp-0.5.6.tgz",
      "integrity": "sha512-FP+p8RB8OWpF3YZBCrP5gtADmtXApB5AMLn+vdyA+PyxCjrCs00mjyUozssO33cwDeT3wNGdLxJ5M//YqtHAJw==",
      "license": "MIT",
      "dependencies": {
        "minimist": "^1.2.6"
      },
      "bin": {
        "mkdirp": "bin/cmd.js"
      }
    },
    "node_modules/torrent-stream/node_modules/immediate-chunk-store": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/immediate-chunk-store/-/immediate-chunk-store-1.0.8.tgz",
      "integrity": "sha512-0tQyTytUaIUskpv5j5L5ZeQuEjYDl9QIekwDUisdqpAM81OZjBaEIriW7hoiRLaLNxj1fXE8e1yx5JaCGrrE7A==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/ip": {
      "version": "1.1.9",
      "resolved": "https://registry.npmjs.org/ip/-/ip-1.1.9.tgz",
      "integrity": "sha512-cyRxvOEpNHNtchU3Ln9KC/auJgup87llfQpQ+t5ghoC/UhL16SWzbueiCsdTnWmqAWl7LadfuwhlqmtOaqMHdQ==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/ip-set": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/ip-set/-/ip-set-1.0.2.tgz",
      "integrity": "sha512-Mb6kv78bTi4RNAIIWL8Bbre7hXOR2pNUi3j8FaQkLaitf/ZWxkq3/iIwXNYk2ACO3IMfdVdQrOkUtwZblO7uBA==",
      "license": "MIT",
      "dependencies": {
        "ip": "^1.1.3"
      }
    },
    "node_modules/torrent-stream/node_modules/ipaddr.js": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-2.3.0.tgz",
      "integrity": "sha512-Zv/pA+ciVFbCSBBjGfaKUya/CcGmUHzTydLMaTwrUUEM2DIEO3iZvueGxmacvmN50fGpGVKeTXpb2LcYQxeVdg==",
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/torrent-stream/node_modules/k-bucket": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/k-bucket/-/k-bucket-0.6.0.tgz",
      "integrity": "sha512-1zJpqkrLYgolqdO1TE1/FWf+mHfhJKLC2Wpi4JaMFZKi4b6tFEn9/d+JqscBIJw5auWFewp16CSAEetFGEC4NQ==",
      "license": "MIT",
      "dependencies": {
        "buffer-equal": "0.0.1",
        "inherits": "^2.0.1"
      }
    },
    "node_modules/torrent-stream/node_modules/k-rpc": {
      "version": "3.7.0",
      "resolved": "https://registry.npmjs.org/k-rpc/-/k-rpc-3.7.0.tgz",
      "integrity": "sha512-XFL8PatIToQ/qhSSAq9FSK73wk4fX4DcHqjnkvSCrWC59PV02Oj1KeYa3KnREAXgA1DlCSzcKjk7M8usnT/dUw==",
      "license": "MIT",
      "dependencies": {
        "buffer-equals": "^1.0.3",
        "k-bucket": "^2.0.0",
        "k-rpc-socket": "^1.5.0"
      }
    },
    "node_modules/torrent-stream/node_modules/k-rpc/node_modules/k-bucket": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/k-bucket/-/k-bucket-2.0.1.tgz",
      "integrity": "sha512-Xuye90xBBDJJbvNSuy3z/Yl8ceVX02/sopqGUEwJkMgRw+//TQXx0/Hbgp60GsoVfZcCBllQXXp6AWe2INu8pw==",
      "license": "MIT",
      "dependencies": {
        "buffer-equal": "0.0.1",
        "randombytes": "^2.0.3"
      }
    },
    "node_modules/torrent-stream/node_modules/lru": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/lru/-/lru-2.0.1.tgz",
      "integrity": "sha512-JGRd3IHM64MPsGVw1Mqbz2Y2HDIePqi/MLfPtdrkHQwvvJnSrS9b6gM3KS9PFR5xJnufXJczHHZSmGqfuII1ew==",
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.1"
      },
      "engines": {
        "node": ">= 0.4.0"
      }
    },
    "node_modules/torrent-stream/node_modules/magnet-uri": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/magnet-uri/-/magnet-uri-4.2.3.tgz",
      "integrity": "sha512-aHhR49CRBOq3BX6jQOBdGMXhNT2+9LIH3CCIwHlR+aFE8nWMfBD1aNYxfm2u2LsCOwvfPeyCsdIg9KXSwdsOLQ==",
      "license": "MIT",
      "dependencies": {
        "flatten": "0.0.1",
        "thirty-two": "^0.0.2",
        "xtend": "^4.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/mimic-response": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/mimic-response/-/mimic-response-1.0.1.tgz",
      "integrity": "sha512-j5EctnkH7amfV/q5Hgmoal1g2QHFJRraOtmx0JpIqkxhBhI/lJSl1nMpQ45hVarwNETOoWEimndZ4QK0RHxuxQ==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/torrent-stream/node_modules/once": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/once/-/once-1.3.3.tgz",
      "integrity": "sha512-6vaNInhu+CHxtONf3zw3vq4SP2DOQhjBvIa3rNcG0+P7eKWlYH6Peu7rHizSloRU2EwMz6GraLieis9Ac9+p1w==",
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/torrent-stream/node_modules/parse-torrent": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/parse-torrent/-/parse-torrent-4.1.0.tgz",
      "integrity": "sha512-FeoGe8bOYmSzxO31kYy44A03FjuULCMOIMom8KyuGvO8/lLVPJyo2nr9CwH/iYmNHm74hk7h70o59DOfk9Rq+A==",
      "license": "MIT",
      "dependencies": {
        "magnet-uri": "^4.0.0",
        "parse-torrent-file": "^2.0.0"
      },
      "bin": {
        "parse-torrent": "bin/cmd.js"
      }
    },
    "node_modules/torrent-stream/node_modules/random-access-file": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/random-access-file/-/random-access-file-2.2.1.tgz",
      "integrity": "sha512-RGU0xmDqdOyEiynob1KYSeh8+9c9Td1MJ74GT1viMEYAn8SJ9oBtWCXLsYZukCF46yududHOdM449uRYbzBrZQ==",
      "license": "MIT",
      "dependencies": {
        "mkdirp-classic": "^0.5.2",
        "random-access-storage": "^1.1.1"
      }
    },
    "node_modules/torrent-stream/node_modules/random-access-storage": {
      "version": "1.4.3",
      "resolved": "https://registry.npmjs.org/random-access-storage/-/random-access-storage-1.4.3.tgz",
      "integrity": "sha512-D5e2iIC5dNENWyBxsjhEnNOMCwZZ64TARK6dyMN+3g4OTC4MJxyjh9hKLjTGoNhDOPrgjI+YlFEHFnrp/cSnzQ==",
      "license": "MIT",
      "dependencies": {
        "events": "^3.3.0",
        "inherits": "^2.0.3",
        "queue-tick": "^1.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/simple-get": {
      "version": "2.8.2",
      "resolved": "https://registry.npmjs.org/simple-get/-/simple-get-2.8.2.tgz",
      "integrity": "sha512-Ijd/rV5o+mSBBs4F/x9oDPtTx9Zb6X9brmnXvMW4J7IR15ngi9q5xxqWBKU744jTZiaXtxaPL7uHG6vtN8kUkw==",
      "license": "MIT",
      "dependencies": {
        "decompress-response": "^3.3.0",
        "once": "^1.3.1",
        "simple-concat": "^1.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/string2compact": {
      "version": "1.3.2",
      "resolved": "https://registry.npmjs.org/string2compact/-/string2compact-1.3.2.tgz",
      "integrity": "sha512-3XUxUgwhj7Eqh2djae35QHZZT4mN3fsO7kagZhSGmhhlrQagVvWSFuuFIWnpxFS0CdTB2PlQcaL16RDi14I8uw==",
      "license": "MIT",
      "dependencies": {
        "addr-to-ip-port": "^1.0.1",
        "ipaddr.js": "^2.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/torrent-discovery": {
      "version": "5.4.0",
      "resolved": "https://registry.npmjs.org/torrent-discovery/-/torrent-discovery-5.4.0.tgz",
      "integrity": "sha512-bPTDIA7XEjRlw6vQyt7kM/h1mg1INBsibjbujISITonx4POENZgxfyCSEXZpDhbAkluSPH4HKRKs4/YTmNLC6w==",
      "license": "MIT",
      "dependencies": {
        "bittorrent-dht": "^6.0.0",
        "bittorrent-tracker": "^7.0.0",
        "debug": "^2.0.0",
        "inherits": "^2.0.1",
        "re-emitter": "^1.0.0",
        "run-parallel": "^1.1.2",
        "xtend": "^4.0.0"
      }
    },
    "node_modules/torrent-stream/node_modules/torrent-piece": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/torrent-piece/-/torrent-piece-1.1.2.tgz",
      "integrity": "sha512-ElXPyXKKG73o+uziHJ8qlYE9EuyDVxnK2zWL+pW/2bma7RsLpSwFFIJAb8Qui7/tel2hsHQW1z3zBnfQNREpWA==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/ultron": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/ultron/-/ultron-1.0.2.tgz",
      "integrity": "sha512-QMpnpVtYaWEeY+MwKDN/UdKlE/LsFZXM5lO1u7GaZzNgmIbGixHEmVMIKT+vqYOALu3m5GYQy9kz4Xu4IVn7Ow==",
      "license": "MIT"
    },
    "node_modules/torrent-stream/node_modules/ws": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/ws/-/ws-1.1.5.tgz",
      "integrity": "sha512-o3KqipXNUdS7wpQzBHSe180lBGO60SoK0yVo3CYJgb2MkobuWuBX6dhkYP5ORCLd55y+SaflMOV5fqAB53ux4w==",
      "license": "MIT",
      "dependencies": {
        "options": ">=0.0.5",
        "ultron": "1.0.x"
      }
    },
    "node_modules/type-is": {
      "version": "1.6.18",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-1.6.18.tgz",
      "integrity": "sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==",
      "license": "MIT",
      "dependencies": {
        "media-typer": "0.3.0",
        "mime-types": "~2.1.24"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/ultron": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ultron/-/ultron-1.1.1.tgz",
      "integrity": "sha512-UIEXBNeYmKptWH6z8ZnqTeS8fV74zG0/eRU9VGkpzz+LIJNs8W/zM/L+7ctCkRrgbNnnR0xxw4bKOr0cW0N0Og==",
      "license": "MIT"
    },
    "node_modules/uniq": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/uniq/-/uniq-1.0.1.tgz",
      "integrity": "sha512-Gw+zz50YNKPDKXs+9d+aKAjVwpjNwqzvNpLigIruT4HA9lMZNdMqs9x07kKHB/L9WRzqp4+DlTU5s4wG2esdoA==",
      "license": "MIT"
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "license": "MIT"
    },
    "node_modules/utils-merge": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/utils-merge/-/utils-merge-1.0.1.tgz",
      "integrity": "sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4.0"
      }
    },
    "node_modules/utp": {
      "version": "0.0.7",
      "resolved": "https://registry.npmjs.org/utp/-/utp-0.0.7.tgz",
      "integrity": "sha512-2ZLjisH0HQkpqZTg2m7TK0Yn7TETTg7DxM0EpCKIIIV2ky9w9nSxW5a7gzdk4nH2h+pomrrGw0uywrUJfsm2eA==",
      "dependencies": {
        "cyclist": "~0.1.0"
      }
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==",
      "license": "ISC"
    },
    "node_modules/xtend": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/xtend/-/xtend-4.0.2.tgz",
      "integrity": "sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.4"
      }
    }
  }
}
\n```\n\n### package.json\n\n```json\n{
  "name": "pwa-torserve",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js",
    "client:install": "cd client && npm install",
    "client:build": "cd client && npm run build"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "lowdb": "^7.0.1",
    "torrent-stream": "^1.2.0"
  }
}\n```\n\n### server/db.js\n\n```js\nimport { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Initialize DB
const defaultData = {
    serverStatus: 'ok',        // 'ok' | 'degraded' | 'error' | 'circuit_open'
    lastStateChange: Date.now(),
    storageFailures: 0,
    progress: {}
}
const dbPath = process.env.DB_PATH || 'db.json'
const adapter = new JSONFile(dbPath)
const db = new Low(adapter, defaultData)

// Ensure DB is ready and migrate existing data
await db.read()

// Merge defaults with existing data (handles DB migrations)
db.data = { ...defaultData, ...db.data }

// Ensure nested objects are initialized
db.data.progress ||= {}

await db.write()

export { db }
\n```\n\n### server/index.js\n\n```js\n// IGNORE SSL ERRORS (Global Hack for Mirrors)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import { addTorrent, getAllTorrents, getTorrent, getRawTorrent, removeTorrent } from './torrent.js'
import { db } from './db.js'
import { startWatchdog, getServerState } from './watchdog.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// DEBUG USER: Log all requests
app.use((req, res, next) => {
    // Filter out boring static files to keep logs clean
    if (!req.url.match(/\.(js|css|png|jpg|ico|map)$/)) {
        console.log(`[HTTP] ${req.method} ${req.url}`)
    }
    next()
})

// Serve static frontend
const distPath = path.join(__dirname, '../client/dist')
app.use(express.static(distPath))

// API: Health Check (lightweight)
app.get('/api/health', (req, res) => {
    const state = getServerState()
    res.json({
        serverStatus: state.serverStatus,
        lastStateChange: state.lastStateChange
    })
})

// API: Status (with server state)
app.get('/api/status', (req, res) => {
    const state = getServerState()

    // Return 503 with Retry-After for critical states
    if (state.serverStatus === 'circuit_open' || state.serverStatus === 'error') {
        res.set('Retry-After', '300') // 5 minutes
        return res.status(503).json({
            serverStatus: state.serverStatus,
            lastStateChange: state.lastStateChange,
            torrents: []
        })
    }

    const torrents = getAllTorrents()
    const status = torrents.map(t => ({
        infoHash: t.infoHash,
        name: t.name,
        progress: t.progress,
        downloadSpeed: t.downloadSpeed,
        numPeers: t.numPeers,
        files: t.files.map(f => ({
            name: f.name,
            length: f.length,
            index: f.index
        }))
    }))

    res.json({
        serverStatus: state.serverStatus,
        lastStateChange: state.lastStateChange,
        torrents: status
    })
})

// API: TMDB Proxy (DISABLED - OFFLINE MODE)
// ISP blocks are too severe. We return 404 immediately to show 
// the "Beautiful Placeholders" on the client without lag.
app.get('/api/tmdb/search', (req, res) => {
    res.status(404).json({ error: 'Offline Mode (Blocked by ISP)' })
})

app.get('/api/tmdb/image/:size/:path', (req, res) => {
    res.status(404).send('Offline Mode')
})

// ─────────────────────────────────────────────────────────────
// API: Jacred Torrent Search (like Lampa)
// ─────────────────────────────────────────────────────────────

import { searchJacred, getMagnetFromJacred } from './jacred.js'

// Search torrents via Jacred
app.get('/api/rutracker/search', async (req, res) => {
    const { query } = req.query
    if (!query) {
        return res.status(400).json({ error: 'Query required' })
    }

    console.log(`[Jacred] Searching: ${query}`)
    const result = await searchJacred(query)
    res.json(result)
})

// Get magnet link (already in search results, but keeping for compatibility)
app.get('/api/rutracker/magnet/:topicId', async (req, res) => {
    const { topicId } = req.params
    // topicId is actually the magnet URL for Jacred
    const result = await getMagnetFromJacred(decodeURIComponent(topicId))
    res.json(result)
})

// API: Generate M3U Playlist for Video Files
app.get('/playlist.m3u', (req, res) => {
    // 1. Determine Host (Synology IP or Localhost)
    const host = req.get('host') || `localhost:${PORT}`
    const protocol = req.protocol || 'http'

    // 2. Get All Torrents
    const torrents = getAllTorrents()

    let m3u = '#EXTM3U\n'
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.mpg', '.mpeg']

    // 3. Filter & Generate
    for (const torrent of torrents) {
        if (!torrent.files) continue;

        for (const file of torrent.files) {
            const ext = path.extname(file.name).toLowerCase()
            if (videoExtensions.includes(ext)) {
                // Metadata for player
                // Use -1 for live/unknown duration, or try to guess if available
                m3u += `#EXTINF:-1,${file.name}\n`

                // Stream URL: http://<NAS_IP>:3000/stream/<HASH>/<INDEX>
                m3u += `${protocol}://${host}/stream/${torrent.infoHash}/${file.index}\n`
            }
        }
    }

    res.set('Content-Type', 'audio/x-mpegurl')
    res.set('Content-Disposition', 'attachment; filename="playlist.m3u"')
    res.send(m3u)
})

// API: Add Torrent
app.post('/api/add', async (req, res) => {
    const { magnet } = req.body
    if (!magnet) return res.status(400).json({ error: 'Magnet URI required' })

    try {
        const torrent = await addTorrent(magnet)
        res.json({ infoHash: torrent.infoHash, name: torrent.name })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Map of MIME types
const mimeMap = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg'
}

// API: Remove Torrent (with File Hygiene)
app.delete('/api/delete/:infoHash', async (req, res) => {
    const { infoHash } = req.params
    const torrent = getTorrent(infoHash) // Get info BEFORE deletion

    const success = removeTorrent(infoHash)

    if (success) {
        // 🔥 PHYSICAL DELETION (FILE HYGIENE - ASYNC) 🔥
        if (torrent && torrent.name) {
            const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
            const fullPath = path.join(downloadPath, torrent.name)

            // Fire-and-forget async deletion to avoid blocking the server
            import('fs/promises').then(fsPromises => {
                fsPromises.rm(fullPath, { recursive: true, force: true })
                    .then(() => console.log(`[File Hygiene] Successfully removed: ${fullPath}`))
                    .catch(e => console.error(`[Delete Error] Could not remove ${fullPath}: ${e.message}`))
            })
        }
        res.json({ success: true, message: 'Deletion started asynchronously' })
    } else {
        res.status(404).json({ error: 'Torrent not found' })
    }
})

// API: Stream
app.get('/stream/:infoHash/:fileIndex', async (req, res) => {
    const { infoHash, fileIndex } = req.params
    const range = req.headers.range

    // Use raw engine to access createReadStream
    const engine = getRawTorrent(infoHash)
    if (!engine) return res.status(404).send('Torrent not found')

    const file = engine.files?.[fileIndex]
    if (!file) return res.status(404).send('File not found')

    // Detect Content-Type
    const ext = path.extname(file.name).toLowerCase()
    const contentType = mimeMap[ext] || 'application/octet-stream'

    // Synology Cache Path Check
    const downloadPath = process.env.DOWNLOAD_PATH
    if (downloadPath && !fs.existsSync(downloadPath)) {
        console.error(`Cache path not accessible: ${downloadPath}`)
        return res.status(500).send('Cache storage not accessible')
    }

    if (!range) {
        const head = {
            'Content-Length': file.length,
            'Content-Type': contentType,
        }
        res.writeHead(200, head)
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        const chunksize = (end - start) + 1

        // Smart Progress Tracking
        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0

        // Save to DB (Throttled: max once per 10s per file)
        const trackKey = `${infoHash}_${fileIndex}`
        const now = Date.now()
        const lastUpdate = db.data.progress[trackKey]?.timestamp || 0

        if (now - lastUpdate > 10000) {
            db.data.progress[trackKey] = {
                timestamp: now,
                position: start,
                progressTime: progressTime,
                percentage: (start / file.length) * 100
            }
            await db.write()
        }

        const head = {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        }

        res.writeHead(206, head)
        file.createReadStream({ start, end }).pipe(res)
    }
})

// Fallback for SPA
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'))
    } else {
        res.send('Frontend not built. Run npm run client:build')
    }
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)

    // Start watchdog in background (non-blocking)
    startWatchdog().catch(err => {
        console.error('[Server] Watchdog failed:', err.message)
    })
})
\n```\n\n### server/jacred.js\n\n```js\n/**
 * Jacred Torrent Search API
 * Использует публичные Jacred сервисы (как в Lampa)
 */

import https from 'https'
import http from 'http'

// List of Jacred mirrors (try in order)
const JACRED_MIRRORS = [
    'jacred.xyz',
    'jacred.pro',
    'jac.red'
]

let currentMirror = JACRED_MIRRORS[0]

/**
 * Search torrents via Jacred API
 */
export const searchJacred = async (query) => {
    const results = []

    for (const mirror of JACRED_MIRRORS) {
        try {
            const data = await doSearch(mirror, query)
            if (data && data.length > 0) {
                currentMirror = mirror
                console.log(`[Jacred] Using mirror: ${mirror}`)
                return { results: data }
            }
        } catch (err) {
            console.warn(`[Jacred] Mirror ${mirror} failed:`, err.message)
        }
    }

    return { error: 'All mirrors failed', results: [] }
}

/**
 * Do search request to specific mirror
 */
const doSearch = (mirror, query) => {
    return new Promise((resolve, reject) => {
        // Jacred uses Jackett-compatible API
        const searchPath = `/api/v2.0/indexers/all/results?apikey=&Query=${encodeURIComponent(query)}`

        const options = {
            hostname: mirror,
            port: 443,
            path: searchPath,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    // Jackett returns { Results: [...] }
                    const results = (json.Results || json.results || []).slice(0, 20).map(r => ({
                        id: r.Guid || r.guid || Math.random().toString(36),
                        title: r.Title || r.title || 'Unknown',
                        size: formatSize(r.Size || r.size || 0),
                        seeders: r.Seeders || r.seeders || 0,
                        tracker: r.Tracker || r.tracker || 'Unknown',
                        magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null,
                        magnetUrl: r.MagnetUri || r.magnetUri || r.Link || r.link || null
                    }))
                    resolve(results)
                } catch (err) {
                    reject(new Error('Parse error: ' + err.message))
                }
            })
        })

        req.on('error', reject)
        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Timeout'))
        })

        req.end()
    })
}

/**
 * Format bytes to human readable
 */
const formatSize = (bytes) => {
    if (!bytes) return 'N/A'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024
        i++
    }
    return `${size.toFixed(1)} ${units[i]}`
}

/**
 * Get magnet from result (already included in search results)
 */
export const getMagnetFromJacred = async (magnetUrl) => {
    // Magnet is already in the search result, just return it
    if (magnetUrl && magnetUrl.startsWith('magnet:')) {
        return { magnet: magnetUrl }
    }
    return { error: 'No magnet link' }
}
\n```\n\n### server/rutracker.js\n\n```js\n/**
 * RuTracker Search API
 * Парсинг поиска RuTracker через HTTP
 */

import https from 'https'
import http from 'http'

// RuTracker credentials from .env
const RUTRACKER_LOGIN = process.env.RUTRACKER_LOGIN || ''
const RUTRACKER_PASSWORD = process.env.RUTRACKER_PASSWORD || ''

let sessionCookie = null

/**
 * Login to RuTracker and get session cookie
 */
const login = async () => {
    if (!RUTRACKER_LOGIN || !RUTRACKER_PASSWORD) {
        throw new Error('RUTRACKER_LOGIN and RUTRACKER_PASSWORD must be set in .env')
    }

    return new Promise((resolve, reject) => {
        const postData = `login_username=${encodeURIComponent(RUTRACKER_LOGIN)}&login_password=${encodeURIComponent(RUTRACKER_PASSWORD)}&login=%C2%F5%EE%E4`

        const options = {
            hostname: 'rutracker.cc',
            port: 443,
            path: '/forum/login.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }

        const req = https.request(options, (res) => {
            const cookies = res.headers['set-cookie']
            if (cookies) {
                sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')
                console.log('[RuTracker] Login successful')
                resolve(sessionCookie)
            } else {
                reject(new Error('Login failed - no cookies received'))
            }
        })

        req.on('error', reject)
        req.write(postData)
        req.end()
    })
}

/**
 * Search RuTracker
 */
export const searchRuTracker = async (query) => {
    // Ensure we're logged in
    if (!sessionCookie) {
        try {
            await login()
        } catch (err) {
            console.error('[RuTracker] Login failed:', err.message)
            return { error: 'Login failed', results: [] }
        }
    }

    return new Promise((resolve, reject) => {
        const searchUrl = `/forum/tracker.php?nm=${encodeURIComponent(query)}`

        const options = {
            hostname: 'rutracker.cc',
            port: 443,
            path: searchUrl,
            method: 'GET',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    const results = parseSearchResults(data)
                    resolve({ results })
                } catch (err) {
                    console.error('[RuTracker] Parse error:', err.message)
                    resolve({ error: 'Parse failed', results: [] })
                }
            })
        })

        req.on('error', (err) => {
            console.error('[RuTracker] Request error:', err.message)
            resolve({ error: err.message, results: [] })
        })

        req.end()
    })
}

/**
 * Parse search results HTML
 */
const parseSearchResults = (html) => {
    const results = []

    // Simple regex-based parsing (works without cheerio)
    // Match torrent rows: <a class="tLink" href="/forum/viewtopic.php?t=ID">TITLE</a>
    const titleRegex = /<a[^>]*class="tLink"[^>]*href="[^"]*t=(\d+)"[^>]*>([^<]+)<\/a>/g
    // Match size: <td class="tor-size"...>SIZE</td>
    const sizeRegex = /<td[^>]*class="tor-size"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g
    // Match seeders: <b class="seedmed">NUM</b>
    const seedRegex = /<b class="seedmed">(\d+)<\/b>/g

    let titleMatch, i = 0
    const sizes = []
    const seeds = []

    // Collect all sizes
    let sizeMatch
    while ((sizeMatch = sizeRegex.exec(html)) !== null) {
        sizes.push(sizeMatch[1].trim())
    }

    // Collect all seeders
    let seedMatch
    while ((seedMatch = seedRegex.exec(html)) !== null) {
        seeds.push(parseInt(seedMatch[1]))
    }

    // Match titles with topic IDs
    while ((titleMatch = titleRegex.exec(html)) !== null && i < 20) {
        const topicId = titleMatch[1]
        const title = titleMatch[2]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()

        results.push({
            id: topicId,
            title: title,
            size: sizes[i] || 'N/A',
            seeders: seeds[i] || 0,
            magnetUrl: `https://rutracker.cc/forum/viewtopic.php?t=${topicId}`
        })
        i++
    }

    return results
}

/**
 * Get magnet link from topic page
 */
export const getMagnetLink = async (topicId) => {
    if (!sessionCookie) {
        try {
            await login()
        } catch (err) {
            return { error: 'Login failed' }
        }
    }

    return new Promise((resolve) => {
        const options = {
            hostname: 'rutracker.cc',
            port: 443,
            path: `/forum/viewtopic.php?t=${topicId}`,
            method: 'GET',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                // Extract magnet link: magnet:?xt=urn:btih:HASH...
                const magnetMatch = data.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
                if (magnetMatch) {
                    resolve({ magnet: magnetMatch[0] })
                } else {
                    resolve({ error: 'Magnet not found' })
                }
            })
        })

        req.on('error', () => resolve({ error: 'Request failed' }))
        req.end()
    })
}
\n```\n\n### server/torrent.js\n\n```js\nimport torrentStream from 'torrent-stream'
import process from 'process'

const engines = new Map()

export const addTorrent = (magnetURI) => {
    return new Promise((resolve, reject) => {
        // Simple duplicate check
        for (const [key, engine] of engines.entries()) {
            if (key === magnetURI) {
                console.log('Torrent engine already exists for this magnet')
                return resolve(formatEngine(engine))
            }
        }

        const path = process.env.DOWNLOAD_PATH || './downloads'
        console.log('[Torrent] Adding magnet, download path:', path)

        let engine
        try {
            engine = torrentStream(magnetURI, {
                path: path,
                connections: 20,       // 📉 RAM-safe limit (Reverted from 50)
                uploads: 0,
                dht: true,             // ✅ DHT enabled (needed for trackerless torrents)
                verify: false          // ⚡ Faster torrent start
            })
        } catch (err) {
            console.error('[Torrent] Failed to create engine:', err.message)
            return reject(err)
        }

        engine.on('ready', () => {
            console.log('[Torrent] Engine ready:', engine.infoHash)
            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
            resolve(formatEngine(engine))
        })

        engine.on('error', (err) => {
            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        // Timeout: reject if torrent doesn't connect within 60s
        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                console.warn('[Torrent] Timeout: no peers found')
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 60 seconds'))
            }
        }, 60000)
    })
}

export const removeTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (!engine) return false

    console.log('Removing torrent:', infoHash)
    engine.destroy(() => {
        console.log('Engine destroyed:', infoHash)
    })

    // Remove from map (both keys)
    engines.delete(infoHash)
    for (const [key, val] of engines.entries()) {
        if (val === engine) engines.delete(key)
    }
    return true
}

export const getTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (engine) return formatEngine(engine)
    return null
}

// Get raw engine for streaming (with createReadStream)
export const getRawTorrent = (infoHash) => {
    return engines.get(infoHash) || null
}

export const getAllTorrents = () => {
    const uniqueEngines = new Set(engines.values())
    return Array.from(uniqueEngines).map(formatEngine)
}

const formatEngine = (engine) => {
    // Calculate downloaded bytes
    let downloaded = 0
    if (engine.files) {
        engine.files.forEach(file => {
            // torrent-stream tracks how much of each file has been downloaded
            if (file.length && engine.bitfield) {
                const pieces = Math.ceil(file.length / engine.torrent?.pieceLength || 1)
                // Rough estimation based on peer activity
            }
        })
    }

    const totalSize = engine.files?.reduce((sum, f) => sum + f.length, 0) || 0

    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: 0, // torrent-stream doesn't provide easy progress
        downloadSpeed: engine.swarm?.downloadSpeed() || 0,
        uploadSpeed: engine.swarm?.uploadSpeed() || 0,
        numPeers: engine.swarm?.wires?.length || 0,
        totalSize: totalSize,
        files: engine.files ? engine.files.map((file, index) => ({
            name: file.name,
            length: file.length,
            path: file.path,
            index: index
        })) : []
    }
}
\n```\n\n### server/watchdog.js\n\n```js\n/**
 * Watchdog Module - Self-Healing Architecture
 * PWA-TorServe v2.1
 * 
 * Features:
 * - Non-blocking async monitoring loop
 * - RAM monitoring with hysteresis (30s delay for degraded)
 * - NFS Circuit Breaker (3 failures → 5min pause)
 * - Automatic counter reset on recovery
 */

import { db } from './db.js'
import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────────────────────
// Configuration Constants
// ─────────────────────────────────────────────────────────────

const CONFIG = {
    CHECK_INTERVAL_MS: 30000,           // Main loop interval: 30s
    RAM_OK_THRESHOLD_MB: 800,           // ⬆ Relaxed for 100GB files
    RAM_DEGRADED_THRESHOLD_MB: 1000,    // ⬆ Limit increased to 1GB
    HYSTERESIS_DELAY_MS: 30000,         // 30s delay before degraded
    STORAGE_CHECK_TIMEOUT_MS: 5000,     // 5s timeout for storage check
    CIRCUIT_BREAKER_THRESHOLD: 3,       // 3 failures → circuit open
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000 // 5 minutes cooldown
}

// ─────────────────────────────────────────────────────────────
// State Variables
// ─────────────────────────────────────────────────────────────

let degradedSince = null              // Timestamp when RAM first exceeded threshold
let circuitOpenUntil = null           // Timestamp when circuit breaker will retry
let isWatchdogRunning = false

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getRAMUsageMB = () => {
    const used = process.memoryUsage()
    // Use RSS (Resident Set Size) instead of heapUsed
    // RSS includes buffers, video data, and system resources
    // This is what Android actually sees and may kill the process for
    return Math.round(used.rss / 1024 / 1024)
}

/**
 * Check storage accessibility with timeout
 * Creates directory if it doesn't exist
 * PHYSICAL WRITE TEST: writes .healthcheck file to verify R/W access
 * @returns {Promise<boolean>} true if storage is accessible
 */
const checkStorage = () => {
    return new Promise((resolve) => {
        // Default to ./downloads (relative to app dir) which works on Android Termux
        const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
        const healthFile = path.join(downloadPath, '.healthcheck')

        const timeout = setTimeout(() => {
            console.warn('[Watchdog] Storage check timeout!')
            resolve(false)
        }, CONFIG.STORAGE_CHECK_TIMEOUT_MS)

        // Ensure directory exists first
        fs.mkdir(downloadPath, { recursive: true }, (mkdirErr) => {
            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                clearTimeout(timeout)
                console.warn(`[Watchdog] Failed to create directory: ${mkdirErr.message}`)
                resolve(false)
                return
            }

            // PHYSICAL WRITE TEST: write timestamp to .healthcheck file
            const testData = `healthcheck:${Date.now()}`
            fs.writeFile(healthFile, testData, (writeErr) => {
                if (writeErr) {
                    clearTimeout(timeout)
                    console.warn(`[Watchdog] Write test failed: ${writeErr.message}`)
                    resolve(false)
                    return
                }

                // Clean up: delete the test file
                fs.unlink(healthFile, (unlinkErr) => {
                    clearTimeout(timeout)
                    if (unlinkErr) {
                        // Non-critical: file was written successfully
                        console.warn(`[Watchdog] Cleanup failed: ${unlinkErr.message}`)
                    }
                    resolve(true)
                })
            })
        })
    })
}

// ─────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────

/**
 * Update server status with persistence
 * @param {string} newStatus - 'ok' | 'degraded' | 'error' | 'circuit_open'
 */
const updateStatus = async (newStatus) => {
    const currentStatus = db.data.serverStatus

    if (currentStatus !== newStatus) {
        console.log(`[Watchdog] Status change: ${currentStatus} → ${newStatus}`)
        db.data.serverStatus = newStatus
        db.data.lastStateChange = Date.now()

        // Reset counters on recovery to OK
        if (newStatus === 'ok') {
            db.data.storageFailures = 0
            degradedSince = null
            console.log('[Watchdog] Recovery complete, counters reset')
        }

        await db.write()
    }
}

/**
 * Main watchdog check cycle
 */
const performCheck = async () => {
    const now = Date.now()
    const ramMB = getRAMUsageMB()

    // ─── Circuit Breaker Check ───
    if (circuitOpenUntil) {
        if (now < circuitOpenUntil) {
            // Still in cooldown, skip all checks
            const remainingMs = circuitOpenUntil - now
            console.log(`[Watchdog] Circuit open, retry in ${Math.round(remainingMs / 1000)}s`)
            return
        }

        // Cooldown expired, attempt recovery
        console.log('[Watchdog] Circuit breaker: attempting recovery...')
        const storageOk = await checkStorage()

        if (storageOk) {
            circuitOpenUntil = null
            await updateStatus('ok')
            console.log('[Watchdog] Circuit breaker: recovery successful!')
        } else {
            // Retry failed, extend cooldown
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            // Update lastStateChange so client shows correct elapsed time
            db.data.lastStateChange = now
            await db.write()
            console.warn('[Watchdog] Circuit breaker: recovery failed, extending cooldown')
        }
        return
    }

    // ─── Storage Check ───
    const storageOk = await checkStorage()

    if (!storageOk) {
        db.data.storageFailures = (db.data.storageFailures || 0) + 1
        console.warn(`[Watchdog] Storage failure #${db.data.storageFailures}`)

        if (db.data.storageFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            await updateStatus('circuit_open')
            console.error('[Watchdog] Circuit breaker OPEN! Pausing checks for 5 minutes.')
            return
        }
    } else {
        // Storage OK, reset failure counter
        if (db.data.storageFailures > 0) {
            db.data.storageFailures = 0
            await db.write()
        }
    }

    // ─── RAM Check with Hysteresis ───
    if (ramMB > CONFIG.RAM_DEGRADED_THRESHOLD_MB) {
        if (!degradedSince) {
            degradedSince = now
            console.log(`[Watchdog] RAM ${ramMB}MB > threshold, starting hysteresis timer`)
        } else if (now - degradedSince >= CONFIG.HYSTERESIS_DELAY_MS) {
            await updateStatus('degraded')
        }
    } else if (ramMB < CONFIG.RAM_OK_THRESHOLD_MB) {
        // RAM is OK
        if (db.data.serverStatus === 'degraded') {
            await updateStatus('ok')
        }
        degradedSince = null
    }

    // Log current state
    console.log(`[Watchdog] RAM: ${ramMB}MB | Status: ${db.data.serverStatus} | Storage Failures: ${db.data.storageFailures}`)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Start the async watchdog loop
 */
export const startWatchdog = async () => {
    if (isWatchdogRunning) {
        console.warn('[Watchdog] Already running!')
        return
    }

    isWatchdogRunning = true
    console.log('[Watchdog] Starting async monitoring loop...')

    // Initial check
    try {
        await performCheck()
    } catch (err) {
        console.error('[Watchdog] Initial check failed:', err.message)
    }

    // Non-blocking loop with error recovery
    while (isWatchdogRunning) {
        await sleep(CONFIG.CHECK_INTERVAL_MS)
        try {
            await performCheck()
        } catch (err) {
            // Log error but DON'T crash - watchdog must survive
            console.error('[Watchdog] Check failed, will retry:', err.message)
        }
    }
}

/**
 * Stop the watchdog loop
 */
export const stopWatchdog = () => {
    isWatchdogRunning = false
    console.log('[Watchdog] Stopped')
}

/**
 * Get current server state for API responses
 */
export const getServerState = () => {
    return {
        serverStatus: db.data.serverStatus,
        lastStateChange: db.data.lastStateChange,
        storageFailures: db.data.storageFailures
    }
}
\n```\n\n### vercel.json\n\n```json\n{
    "version": 2,
    "builds": [
        {
            "src": "package.json",
            "use": "@vercel/node"
        },
        {
            "src": "client/package.json",
            "use": "@vercel/static-build",
            "config": {
                "distDir": "dist"
            }
        }
    ],
    "routes": [
        {
            "src": "/api/(.*)",
            "dest": "/server/index.js"
        },
        {
            "src": "/stream/(.*)",
            "dest": "/server/index.js"
        },
        {
            "src": "/(.*)",
            "dest": "/client/$1"
        }
    ]
}\n```\n\n