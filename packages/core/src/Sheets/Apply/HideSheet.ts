import { Worksheet } from '../Domain/Worksheet';
import { BooleanNumber } from '../../Enum';

/**
 *
 * @param worksheet
 * @param hidden
 * @returns
 *
 * @internal
 */
export function SetWorkSheetHideService(
    worksheet: Worksheet,
    hidden: BooleanNumber
): BooleanNumber {
    // get config
    const config = worksheet.getConfig();

    // store old hidden setting
    const oldHidden = config.hidden;

    // set new hidden setting
    config.hidden = hidden;

    // return old hidden setting to undo
    return oldHidden;
}
