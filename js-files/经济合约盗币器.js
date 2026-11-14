(function(){
    function getReduxStoreFromDOM() {
        const internalRoots = Array.from(document.querySelectorAll('*')).map(el => {
            const key = Object.keys(el).filter(keyName => keyName.includes('__reactContainer')).at(-1);
            return el[key];
        }).filter(key => key);

        for (const root of internalRoots) {
            const seen = new Map();
            const stores = new Set();

            const search = obj => {
                if (seen.has(obj)) {
                    return;
                }
                seen.set(obj, true);

                for (const name in obj) {
                    if (name === 'getState') {
                        const store = obj;
                        const state = store.getState();
                        if (state?.scratchGui?.vm && state.scratchPaint && state.locales) {
                            return store; // Found target store
                        }
                        stores.add(obj);
                    }

                    // eslint-disable-next-line no-prototype-builtins
                    if ((obj?.hasOwnProperty?.(name)) && (typeof obj[name] === 'object') && (obj[name] !== null)) {
                        const result = search(obj[name]);
                        if (result) return result; // Propagate found store
                    }
                }
            };

            const result = search(root);
            if (result) return result;
        }
        return null;
    }
    const vm=getReduxStoreFromDOM()?.getState()?.scratchGui?.vm;
    if(!vm) alert("鑾峰彇vm澶辫触");
    const runtime=vm.runtime;
    let obj={
        getNumber(id){
            return runtime.ext_GandiEconomy.apis.getSmartContractAccountByContractId(id);
        },
        getAllcontract(){
            return runtime.ext_GandiEconomy.apis.getSmartContractList();
        },
        async count(){
            let count=0;
            for(let contract of await this.getAllcontract()){
                count+=await this.getNumber(contract.id);
            }
            return count;
        },
        async allCoins(number=Infinity){
            let count=0;
            const all=await this.getAllcontract();
            console.log("鎵€鏈夊悎绾�", all);
            for(let contract of all){
                const n=Math.min(await this.getNumber(contract.id), number);
                const result=await coin(n, contract);
                console.log(result, contract, n);
                if(result=="鍙戞斁鎴愬姛"){
                    count+=n;
                    number-=n;
                }
            }
            return count;
        },
        getRule(contract){
            return contract.rules.find(rule=>rule.rule.code==="award");
        },
        /*
        async aaaaa(){
            for(let contract of await this.getAllcontract()){
                for(let rule of contract.rules){
                    rule.rule.code="award";
                }
            }
        }
        */
    };
    const _execEconomyContract=runtime._primitives.GandiEconomy_execEconomyContract;
    runtime._primitives.GandiEconomy_execEconomyContract=function(args, util){
        const {code}=args.mutation.blockInfo.extra; // donate浠ｈ〃鐜╁鍚戝悎绾︽姇甯侊紝award浠ｈ〃鍚堢害鍚戠帺瀹舵姇甯�
        if(code=="donate") return Promise.resolve(true);
        return _execEconomyContract.call(this, args, util);
    }
    function coin(
        bucks, // 閲戝竵鏁伴噺
        contract, // 鍚堢害
        ruleId,
    ){
        ruleId=ruleId ?? obj.getRule(contract).id;
        /*
        return runtime._primitives.GandiEconomy_execEconomyContract({
            bucks,
            mutation: {
                blockInfo: {
                    extra: {
                        code: "award", // award浠ｈ〃鍚堢害鍚戠帺瀹舵姇甯�
                        contractId,
                    }
                }
            }
        });
        */
       return runtime.ext_GandiEconomy.apis.requestExecuteSmartContract(
           contract.id,
           ruleId,
           "award", // award浠ｈ〃鍚堢害鍚戠帺瀹舵姇甯�
           {
               bucks,
           },
       ) 
    }
    Object.assign(obj, {coin});
    if(!runtime.ext_GandiEconomy) alert("褰撳墠浣滃搧娌℃湁鐢ㄧ粡娴庡悎绾�");
    else{
        obj.count().then(count=>alert(`鍏辨湁${count}甯侊紝姝ｅ湪灏濊瘯鍙栧竵`));
        obj.allCoins().then(count=>alert(`鎴愬姛鍙栧嚭${count}甯乣));
    }
})();