/**
 * ngPopup.js
 * @version 1.0.2
 * @author Fábio Nogueira <fabio.bacabal@gmail.com>
 * @requires ngAnimate, ngRoute
 */
 
(function(){
    var popupsContainer, ngPopupService, $animate, $timeout,
        waitForNgInclude = [],
        ngIncludePending = {},
        popupsRegistered = {},
        DEFAULT_OPTIONS = {
            offsetX: 0,
            offsetY: 0,
            position: 'left|bottom'
        },
        NG_POPUP_HIDE_CLASS = window.NG_POPUP_HIDE_CLASS || 'ng-popup-hide',
        NG_POPUP_URL        = window.NG_POPUP_URL || '/ng-popup';
    
    angular
        .module('ngPopup', ['ngAnimate', 'ngRoute'])
        .config(['$routeProvider', function($routeProvider){
            document.body.appendChild(popupsContainer);
            $routeProvider.when(NG_POPUP_URL, {});
        }])
        .run(['$popup', '$location', "$route", '$rootScope', '$timeout', function($popup, $location, $route, $rootScope, timeout){
            $timeout = timeout;
            
            $rootScope.$on('$includeContentRequested', function(event, templateName){
                ngIncludePending[templateName] = true; 
            });
            $rootScope.$on('$includeContentLoaded', function(event, templateName){
                var i, o, a=[];
                
                delete(ngIncludePending[templateName]);
                
                for (i=0; i<waitForNgInclude.length; i++){
                    a.push(waitForNgInclude[i]);
                }
                
                waitForNgInclude = [];
                
                for (i=0; i<a.length; i++){
                    o = a[i];                    
                    ngPopupService.show(o.elementOrId, o.options);
                }
                
                a = [];
            });
            
            $rootScope.$on('$locationChangeStart', function(event){  
                var e, url;
                
                url = $location.url();
                
                if (url===NG_POPUP_URL){
                    if (!$location.$$ngPopup){
                        //se chegou aqui significa que está iniciando a aplicação com a url /ng-popup
                        $location.url('/');
                    }
                    return false;
                }
                
                delete ($location.$$ngPopup);
                
                //se a url aponta para um popup
                e = $popup.getElement(url);
                if (e){
                    //se nenhuma ainda não foi definida nenhuma rota url
                    if (!$route.current || ($route.current && !$route.current.$$route)){
                        //  Adiciona a url /ng-popup para possibilitar que ao usar o botão voltar do navegador, o popup possa fechar automaticamente,
                        //caso contrário, sairia da página atual.
                        $location.$$ngPopup = true;
                        $location.url(NG_POPUP_URL);
                    }
                    
                    //exibe o popup e cancela a mudança de rota
                    $popup.show(e);
                    event.preventDefault();
                }else{
                    //  Sei que a url não aponta para um popup, então
                    //verifico se existe um popup visível
                    e = $popup.getTopMost();                    
                    if (e){
                        //Agora sei que tem pelo menos um popup visível.
                        //  Verifico se não tem um outro popup por baixo do popup visível e
                        //se a url atual é /ng-popup.
                        if ( !($route.current.$$route && $route.current.$$route.originalPath===NG_POPUP_URL && !e[0].$$ngPopupPrevious) ){
//                            if ($route.current.$$route.originalPath!==url && $route.routes[url]){
//                                return $popup.hideAll();
//                            }                            
                            event.preventDefault();
                        }
                        
                        $popup.hide(e);
                    }else{
                        //hide all popup
                        $popup.hideAll();
                    }
                }
            });
            
        }])
        .directive('ngPopup', ['$popup', function($popup){
            return {
                restrict: 'AE',
                link: function ($scope, $element, attr) {
                    $popup.create($element, attr.ngPopup);
                }
            };
        }])
        .service('$popup', ['$animate',function(animate){
            $animate = animate;
            return ngPopupService;
        }]);
    
    ngPopupService = {
        create: function($element, id){
            var oldId = $element.attr('id') || id;
            
            popupsRegistered[id] = oldId;
            
            $element
                .attr('id', oldId)
                .addClass('ng-popup '+NG_POPUP_HIDE_CLASS)
                .css({display:'none'});
            
            $element[0].$$ngPopupId = id;
        },
        destroy: function(elementOrId){
            var $element = getPopupElement(elementOrId);
            
            if ($element){
                $element.remove();
            }
        },
        
        /**
         * @description Calcula a posição do popup em relação a um elemento referência
         * @param {Object} options default {offsetX:0, offsetY:0, position:'left|bottom'}
         * @param {HTMLElement} popupElement Elemento popup a ser exibido
         * @param {HTMLElement} referenceElement (optional) Elemento de referência de exibição do popup
         */
        calculatePosition: function(options, popupElement, referenceElement) {
            var i, j, x, y, s, xp, yp, a1, a2, refRect, popupRect, docRect;
            
            xp = yp = '';

            if (referenceElement && options.position) {
                
                //1. prepara o elemento para ser obtido suas dimensões
                s = popupElement.style;
                popupElement.$$cssText = s.cssText;
                
                s.visibility = "hidden";
                s.display = "block";
                s.left = 0;
                s.top = 0;
                
                if (!popupElement.parentNode){
                    document.body.appendChild(popupElement);
                }
                
                //2. calcula a posiçao do popup
                
                docRect   = domRect(document);
                refRect   = domRect(referenceElement);
                popupRect = domRect(popupElement);
                
                a1 = options.position.split(' ');

                for (i = 0; i < a1.length; i++) {
                    a2 = a1[i].split('|');

                    for (j = 0; j < a2.length; j++) {
                        switch (a2[j]) {
                            case 'left':
                                if (angular.isUndefined(x)) {
                                    x = refRect.left + options.offsetX;
                                    xp = 'left';
                                }
                                break;

                            case 'right':
                                if (angular.isUndefined(x)) {
                                    x = (refRect.left - (popupRect.width - refRect.width)) + options.offsetX;
                                    xp = 'right';
                                }
                                break;

                            case 'top':
                                if (angular.isUndefined(y)) {
                                    y = refRect.top - popupRect.height + options.offsetY;
                                    yp = 'top';
                                }
                                break;

                            case 'bottom':
                                if (angular.isUndefined(y)) {
                                    y = refRect.top + refRect.height + options.offsetY;
                                    yp = 'bottom';
                                }
                                break;
                        }

                        //analisa se cabe no ´document.body´ com as coordenadas atuais
                        if (!angular.isUndefined(x)) {
                            if (x + popupRect.width > docRect.width) {
                                x = undefined;
                                xp = '';
                            }
                        }
                        if (!angular.isUndefined(y)) {
                            if (y + popupRect.height > docRect.height) {
                                y = undefined;
                                yp = '';
                            }
                        }
                    }
                }
                
                //3. retorna o elemento para as configurações iniciais
                s.cssText = popupElement.$$cssText;
            }

            return {
                str_xy: xp !== '' && yp !== '' ? xp + '-' + yp : (xp || yp),
                x: angular.isUndefined(x) ? 0 : x,
                y: angular.isUndefined(y) ? 0 : y
            };
        },
        
        /**
         * @description retorna o id do popup atual ou nulo caso não exista
         */
        getTopMost: function(){
            var i, e;

            if (popupsContainer){
                for (i=popupsContainer.childNodes.length-1; i>=0; i--){
                    e = popupsContainer.childNodes[i];
                    if (e.$$ngPopupIsVisible){
                        if (e.offsetHeight && e.offsetWidth){
                            return angular.element(e);
                        }
                    }
                }
            }
            
            return null;
        },
        getElement: function(elementOrId){
            return getPopupElement(elementOrId);
        },
        show: function (elementOrId, options) {
            var r, e, t, tid, $element;
            
            $element = getPopupElement(elementOrId);
            
            if (!$element){
                //se tem template pendente, aguarda o carregamento
                if ( !angular.equals({}, ngIncludePending) ){
                    waitForNgInclude.push({
                        elementOrId: elementOrId,
                        options    : options
                    });
                }
            }else{
                if (!$element[0].$$ngPopupIsVisible) {
                    options = angular.extend({}, DEFAULT_OPTIONS, options);

                    t = options.origin;
                    e = $element[0];

                    e.$$ngPopupPrevious  = this.getTopMost() ? true : false;
                    e.$$ngPopupIsVisible = true;

                    if (angular.isFunction(options)) {
                        options = {onComplete: options};
                    }

                    //coloca o popup sobre todos os outros no DOM
                    popupsContainer.appendChild($element[0]);

                    //calcula a posiçao do popup
                    $element.css({display:'block'});
                    r = ngPopupService.calculatePosition(options, e, options.origin);

                    //posiciona o popup
                    $element.addClass(r.str_xy).css({"top":r.y + 'px', "left":r.x + 'px'});

                    //adiciona a classe css ao elemento referência
    //                if (t) {
    //                    tid = t.getAttribute('id');
    //                    if (!tid) {
    //                        tid = (new Date()).getTime();
    //                    }
    //                    angular.element(t)
    //                        .attr('id', tid)
    //                        .addClass('ng-popup-origin-visible');
    //                }

                    $timeout(function(){
                        $animate.removeClass($element, NG_POPUP_HIDE_CLASS).then(function(){
                            if (options.onComplete) onComplete();
                        });
                    });
                }
            }
        },
        hide: function (elementOrId, options) {
            var e, $element = getPopupElement(elementOrId);
            
            if ($element && $element[0].$$ngPopupIsVisible) {
                e = $element[0];
                options = options || {};
                
                if (angular.isFunction(options)) {
                    options = {
                        onComplete: options
                    };
                }
                
                e.$$ngPopupIsVisible= false;
                e.$$ngPopupPrevious = false;
                
                $timeout(function(){
                    $animate.addClass($element, NG_POPUP_HIDE_CLASS).then(function(){
                        $element.css({display:'none'});
                        if (options.onComplete) onComplete();
                    });
                });
            }
            
        },
        hideAll: function(){
            var e = this.getTopMost();
            
            while (e){
                this.hide(e);
                e = this.getTopMost();
            }
        }
    };
    
    function getPopupElement(elementOrId){
        var e, $element=null;
        
        if (elementOrId){
            if (elementOrId.controller){
                $element = elementOrId;
            }else if (angular.isString(elementOrId)){
                e = document.getElementById(elementOrId);
                if (e && e.$$ngPopupId){
                    $element = angular.element(e);
                }
            }else if (angular.isElement(elementOrId)){
                $element = angular.element(elementOrId);
            }
        }
        
        return $element && $element[0].$$ngPopupId ? $element : null;
    }
    function domRect(element){
        var h, r;

        if (!element){
            r = {top:0,left:0,width:0,height:0};
            h = 0;
        }else {
            if (element===document || element===document.body || element===window){
                var D = document;

                r = D.body.getBoundingClientRect();
                h = Math.max(
                    D.body.scrollHeight, D.documentElement.scrollHeight,
                    D.body.offsetHeight, D.documentElement.offsetHeight,
                    D.body.clientHeight, D.documentElement.clientHeight
                );
            }else{
                r = element.getBoundingClientRect();
                h = r.height;
            }
        }

        return {
            top: r.top,
            left: r.left,
            width: r.width,
            height: h
        };
    }
    
    popupsContainer = document.createElement('div');
    popupsContainer.style.cssText = 'position:absolute;top:0;left:0;';
    
}());
