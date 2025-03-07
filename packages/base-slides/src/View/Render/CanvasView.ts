import { Engine, EVENT_TYPE, IWheelEvent, Layer, Rect, Scene, SceneViewer, ScrollBar, Slide, Viewport } from '@univer/base-render';
import { EventState, getColorStyle, IColorStyle, IPageElement, ISlidePage, Nullable, Registry, sortRules } from '@univer/core';
import { SlidePlugin } from '../../SlidePlugin';
import { SlideBar } from '../UI/SlideBar/SlideBar';
import { ObjectProvider } from './ObjectProvider';

export enum SLIDE_KEY {
    COMPONENT = '__slideRender__',
    SCENE = '__mainScene__',
    VIEW = '__mainView__',
}

export class CanvasView {
    private _scene: Scene;

    private _slideThumbEngine = new Map<string, Engine>();

    private _slide: Slide;

    private _ObjectProvider = new ObjectProvider();

    private _activePageId: string;

    constructor(private _engine: Engine, private _plugin: SlidePlugin) {
        this._initialize();
    }

    getSlide() {
        return this._slide;
    }

    createSlidePages(slideBar: SlideBar, pages: ISlidePage[]) {
        const slideBarRef = slideBar.slideBarRef;
        const thumbList = slideBarRef.current?.childNodes[0].childNodes;
        if (thumbList == null || thumbList.length !== pages.length) {
            return;
        }

        for (var i = 0, len = thumbList.length; i < len; i++) {
            const thumbDom = (thumbList[i] as HTMLElement).querySelector('div');
            const page = pages[i];
            const { id } = page;
            if (this._slideThumbEngine.has(id) || !thumbDom) {
                continue;
            }

            this._createThumb(thumbDom as HTMLElement, id);

            this._createScene(id, this._slide, pages[i]);

            this._thumbSceneRender(id);
        }

        this._activePageId = pages[0].id;

        this._slide.activeFirstPage();
    }

    activePage(pageId?: string) {
        const model = this._plugin.context.getSlide();
        let page: Nullable<ISlidePage>;
        if (pageId) {
            page = model.getPage(pageId);
        } else {
            const pageElements = model.getPages();
            const pageOrder = model.getPageOrder();
            if (pageOrder == null || pageElements == null) {
                return;
            }
            page = pageElements[pageOrder[0]];

            pageId = page.id;
        }

        if (page == null) {
            return;
        }

        const { id } = page;

        this._activePageId = pageId;

        if (this._slide.hasPage(id)) {
            this._slide.changePage(id);
            return;
        }

        this._createScene(id, this._slide, page);
    }

    private _initialize() {
        const engine = this._engine;

        const scene = new Scene(SLIDE_KEY.SCENE, engine, {
            width: 2400,
            height: 1800,
        });
        this._scene = scene;
        const viewMain = new Viewport(SLIDE_KEY.VIEW, scene, {
            left: 0,
            top: 0,
            bottom: 0,
            right: 0,
            isWheelPreventDefaultX: true,
        });

        scene.addViewport(viewMain).attachControl();

        scene.on(EVENT_TYPE.wheel, (evt: unknown, state: EventState) => {
            const e = evt as IWheelEvent;
            if (e.ctrlKey) {
                const deltaFactor = Math.abs(e.deltaX);
                let scrollNum = deltaFactor < 40 ? 0.2 : deltaFactor < 80 ? 0.4 : 0.2;
                scrollNum *= e.deltaY > 0 ? -1 : 1;
                if (scene.scaleX < 1) {
                    scrollNum /= 2;
                }

                if (scene.scaleX + scrollNum > 4) {
                    scene.scale(4, 4);
                } else if (scene.scaleX + scrollNum < 0.1) {
                    scene.scale(0.1, 0.1);
                } else {
                    const value = e.deltaY > 0 ? 0.1 : -0.1;
                    // scene.scaleBy(scrollNum, scrollNum);
                    e.preventDefault();
                }
            } else {
                viewMain.onMouseWheel(e, state);
            }
        });

        ScrollBar.attachTo(viewMain);

        const { left: viewPortLeft, top: viewPortTop } = this._getCenterPositionViewPort();

        const { x, y } = viewMain.getBarScroll(viewPortLeft, viewPortTop);

        viewMain.scrollTo({
            x,
            y,
        });

        this._createSlide();

        this.activePage();

        engine.runRenderLoop(() => {
            scene.render();
            const app = document.getElementById('app');
            if (app) {
                app.innerText = `fps:${Math.round(engine.getFps()).toString()}`;
            }
        });
    }

    private _createSlide() {
        const model = this._plugin.context.getSlide();
        const mainScene = this._scene;

        const { width: sceneWidth, height: sceneHeight } = mainScene;

        const pageSize = model.getPageSize();

        const { width = 100, height = 100 } = pageSize;

        const slideComponent = new Slide(SLIDE_KEY.COMPONENT, {
            left: (sceneWidth - width) / 2,
            top: (sceneHeight - height) / 2,
            width,
            height,
            zIndex: 10,
        });

        slideComponent.enableNav();

        slideComponent.enableSelectedClipElement();

        this._slide = slideComponent;

        mainScene.addObject(slideComponent);
    }

    private _addBackgroundRect(scene: Scene, fill: IColorStyle) {
        const model = this._plugin.context.getSlide();

        const pageSize = model.getPageSize();

        const { width: pageWidth = 0, height: pageHeight = 0 } = pageSize;

        const page = new Rect('canvas', {
            left: 0,
            top: 0,
            width: pageWidth,
            height: pageHeight,
            strokeWidth: 1,
            stroke: 'rgba(198,198,198, 1)',
            fill: getColorStyle(fill) || 'rgba(255,255,255, 1)',
            zIndex: 0,
            evented: false,
        });
        scene.addObject(page, 0);
    }

    private _getCenterPositionViewPort() {
        const { width, height } = this._scene;

        const engine = this._scene.getEngine();

        const canvasWidth = engine?.width || 0;
        const canvasHeight = engine?.height || 0;

        return {
            left: (width - canvasWidth) / 2,
            top: (height - canvasHeight) / 2,
        };
    }

    private _thumbSceneRender(id: string) {
        const thumbEngine = this._slideThumbEngine.get(id);

        if (thumbEngine == null) {
            return;
        }

        const { width, height } = this._slide;

        const { width: pageWidth = width, height: pageHeight = height } = thumbEngine;

        const thumbContext = thumbEngine.getCanvas().getContext();

        this._slide.renderToThumb(thumbContext, id, pageWidth / width, pageHeight / height);
    }

    private _createThumb(thumbDom: HTMLElement, pageId: string) {
        const engine = new Engine();
        engine.setContainer(thumbDom);
        this._slideThumbEngine.set(pageId, engine);
    }

    private _createScene(pageId: string, parent: Engine | Slide, page: ISlidePage) {
        let { width, height } = parent;

        const scene = new Scene(pageId, parent, {
            width,
            height,
        });

        const viewMain = new Viewport('PageViewer_' + pageId, scene, {
            left: 0,
            top: 0,
            bottom: 0,
            right: 0,
        });

        viewMain.closeClip();

        scene.addViewport(viewMain);

        const { pageElements, pageBackgroundFill } = page;

        const objects = this._ObjectProvider.convertToRenderObjects(pageElements, this._scene, this._plugin.context);

        scene.openTransformer();

        this._addBackgroundRect(scene, pageBackgroundFill);

        scene.addObjects(objects);

        const transformer = scene.getTransformer();

        transformer?.onChangeEndObservable.add(() => {
            this._thumbSceneRender(this._activePageId);
        });

        transformer?.onClearControlObservable.add(() => {
            this._thumbSceneRender(this._activePageId);
        });

        this._slide.addPage(scene);

        return scene;
    }
}
