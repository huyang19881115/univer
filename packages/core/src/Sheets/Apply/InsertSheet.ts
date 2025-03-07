import { Workbook, Worksheet } from '../Domain';
import { IWorksheetConfig } from '../../Interfaces';

export function InsertSheet(
    workbook: Workbook,
    index: number,
    worksheetConfig: IWorksheetConfig
): string {
    const iSheets = workbook.getWorksheets();
    const config = workbook.getConfig();
    const { sheets, sheetOrder } = config;
    if (sheets[worksheetConfig.id]) {
        throw new Error(`Insert Sheet fail ${worksheetConfig.id} is already exist`);
    }
    sheets[worksheetConfig.id] = worksheetConfig;
    sheetOrder.splice(index, 0, worksheetConfig.id);
    iSheets.set(
        worksheetConfig.id,
        new Worksheet(workbook.getContext(), worksheetConfig)
    );
    return worksheetConfig.id;
}
