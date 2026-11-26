// Connection and help entries run where they are: the palette shows them as
// buttons (blocks.jsx gives them their own colour), so they cannot be dragged
// into a script. A hidden command block with the same opcode stays, so old
// projects that used the block still load, and blocks.jsx runs the button
// through that block's function.

export const ACTION_BUTTON_PREFIX = 'unifiscratchAction:';

/**
 * Palette entries for a button that runs the extension method `opcode`.
 * @param {string} opcode - method of the extension class (no arguments).
 * @param {string} text - label of the button.
 * @returns {Array.<object>} the button and its hidden block, to spread into `blocks`.
 */
export const actionButton = (opcode, text) => [
    {blockType: 'button', func: `${ACTION_BUTTON_PREFIX}${opcode}`, text},
    {opcode, blockType: 'command', text, hideFromPalette: true}
];

// Button callbacks are shared by the whole toolbox: the key carries the extension id.
export const actionButtonKey = (extensionId, opcode) => `${ACTION_BUTTON_PREFIX}${extensionId}:${opcode}`;

export const ACTION_BUTTON_CLASS = 'unifiscratchActionButton';

/**
 * Give the action buttons of each category's toolbox XML a unique callback key
 * and the CSS class that colours them.
 * @param {Array.<{id: string, xml: string}>} categories - from runtime.getBlocksXML.
 * @returns {Array.<{id: string, xml: string}>} the same categories, buttons marked.
 */
export const markActionButtons = categories => categories.map(category => ({
    ...category,
    xml: category.xml.replace(
        new RegExp(`callbackKey="${ACTION_BUTTON_PREFIX}([A-Za-z0-9_]+)"`, 'g'),
        (_match, opcode) =>
            `callbackKey="${actionButtonKey(category.id, opcode)}" web-class="${ACTION_BUTTON_CLASS}"`
    )
}));

/**
 * Action buttons declared by one extension category.
 * @param {object} categoryInfo - as sent by the VM with EXTENSION_ADDED.
 * @returns {Array.<{key: string, opcode: string}>} callback key and method of each button.
 */
export const actionButtonsOf = categoryInfo => (categoryInfo.blocks || [])
    .map(block => block.info)
    .filter(info => info && info.blockType === 'button' &&
        typeof info.func === 'string' && info.func.startsWith(ACTION_BUTTON_PREFIX))
    .map(info => {
        const opcode = info.func.slice(ACTION_BUTTON_PREFIX.length);
        return {key: actionButtonKey(categoryInfo.id, opcode), opcode};
    });
