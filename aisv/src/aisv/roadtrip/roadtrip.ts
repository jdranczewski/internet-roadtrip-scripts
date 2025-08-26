import { setup_iframe } from './iframe';
import globalCss from './style.css';

// Respond to confirm that we are an Internet Roadtrip frame

GM.addStyle(globalCss);
const [iframe, messenger] = setup_iframe()
messenger.addEventListener("marco", () => {
    messenger.send("polo");
})