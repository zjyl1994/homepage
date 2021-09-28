var code7VM = new Vue({
    el: '#content',
    data: {
        code3: '',
        code5: ''
    },
    computed: {
        code7: function () {
            return md5(this.code3+this.code5+sha1(this.code3+this.code5)).substr(0,16)
        }
    },
    filters: {
        upercase: function (value) {
            return value.substr(0,4).toUpperCase()+value.substr(4,4)+value.substr(8,4).toUpperCase()+value.substr(12,4)
        },
        addspace: function (value) {
            return value.substr(0,4)+" - "+value.substr(4,4)+" - "+value.substr(8,4)+" - "+value.substr(12,4)
        }
    },
    methods: {
        copyCode: event => {
            var value = md5(this.code7VM.code3+this.code7VM.code5+sha1(this.code7VM.code3+this.code7VM.code5)).substr(0,16);
            var code7 = value.substr(0,4).toUpperCase()+value.substr(4,4)+value.substr(8,4).toUpperCase()+value.substr(12,4);
            navigator.clipboard.writeText(code7).then(() => {
                console.log('Async: Copying to clipboard was successful!');
            }, err => {
                console.error('Async: Could not copy text: ', err);
            });
        },
        clearCode: () =>{
            this.code7VM.code3 = "";
            this.code7VM.code5 = "";
        }
    }
});