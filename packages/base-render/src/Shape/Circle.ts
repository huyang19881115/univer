// import { IShapeProps, Shape, IObjectFullState, Group, Scene } from '.';

import { IKeyValue } from '@univer/core';
import { TRANSFORM_CHANGE_OBSERVABLE_TYPE } from '../Basics';
import { IShapeProps, Shape } from './Shape';

export interface ICircleProps extends IShapeProps {
    radius: number;
}

export const CIRCLE_OBJECT_ARRAY = ['radius'];

export class Circle extends Shape<ICircleProps> {
    private _radius: number;

    get radius() {
        return this._radius;
    }

    constructor(key?: string, props?: ICircleProps) {
        super(key, props);
        this._radius = props?.radius || 10;

        this._setFixBoundingBox();

        this.onTransformChangeObservable.add((changeState) => {
            const { type, value, preValue } = changeState;
            if (type === TRANSFORM_CHANGE_OBSERVABLE_TYPE.resize || type === TRANSFORM_CHANGE_OBSERVABLE_TYPE.all) {
                const value = Math.min(this.width, this.height);
                this._radius = value / 2;
                this.width = value;
                this.height = value;
                this._setTransForm();
            }
        });
    }

    private _setFixBoundingBox() {
        this.transformByState({
            width: this._radius * 2,
            height: this._radius * 2,
        });
    }

    protected _draw(ctx: CanvasRenderingContext2D) {
        Circle.drawWith(ctx, this);
    }

    static drawWith(ctx: CanvasRenderingContext2D, props: ICircleProps | Circle) {
        let { radius } = props;

        radius = radius ?? 10;

        ctx.beginPath();

        if (props.strokeDashArray) {
            ctx.setLineDash(props.strokeDashArray);
        }

        ctx.beginPath();
        ctx.arc(radius, radius, radius || 0, 0, Math.PI * 2, false);
        ctx.closePath();

        this._renderPaintInOrder(ctx, props);
    }

    toJson() {
        const props: IKeyValue = {};
        CIRCLE_OBJECT_ARRAY.forEach((key) => {
            if (this[key]) {
                props[key] = this[key];
            }
        });
        return {
            ...super.toJson(),
            ...props,
        };
    }
}
