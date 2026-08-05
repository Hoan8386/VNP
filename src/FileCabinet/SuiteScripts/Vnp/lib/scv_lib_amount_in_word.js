define([],
    function() {
        var th = ['','thousand','million', 'billion','trillion'];
        var dg = ['zero','one','two','three','four', 'five','six','seven','eight','nine'];
        var tn = ['ten','eleven','twelve','thirteen', 'fourteen','fifteen','sixteen', 'seventeen','eighteen','nineteen'];
        var tw = ['twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];

        var objVnd = {
            VND: 'đồng', USD: 'đô la Mỹ', EUR: 'Euro', GBP: 'bảng Anh', AUD: 'đô la Canada'
        };

        var objFr = {
            VND: 'dong', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee', AUD: 'Australian Dollar'
            ,CAD: 'Canadian Dollar', SGD : 'Singapore Dollar', CHF : 'Swiss Franc', MYR : 'Malaysian Ringgit', JPY : 'Japanese Yen'
            ,CNY : 'Chinese Yuan Renminbi'
        };

        function toWords(s) {
            s = s.toString();
            s = s.replace(/[\, ]/g,'');
            if (s != parseFloat(s)) return 'not a number';
            var x = s.indexOf('.');
            if (x == -1)
                x = s.length;
            if (x > 15)
                return 'too big';
            var n = s.split('');
            var str = '';
            var sk = 0;
            for (var i=0;   i < x;  i++) {
                if ((x-i)%3==2) {
                    if (n[i] == '1') {
                        str += tn[Number(n[i+1])] + ' ';
                        i++;
                        sk=1;
                    } else if (n[i]!=0) {
                        str += tw[n[i]-2] + ' ';
                        sk=1;
                    }
                } else if (n[i]!=0) { // 0235
                    str += dg[n[i]] +' ';
                    if ((x-i)%3==0) str += 'hundred ';
                    sk=1;
                }
                if ((x-i)%3==1) {
                    if (sk)
                        str += th[(x-i-1)/3] + ' ';
                    sk=0;
                }
            }

            if (x != s.length) {
                var y = s.length;
                str += 'point ';
                for (var i=x+1; i<y; i++)
                    str += dg[n[i]] +' ';
            }
            return str.replace(/\s+/g,' ');
        }

        function toAmountInWorld(sotien, currency) {
            var inWords = '';
            var sotienN = new Number(sotien);
            if(currency == 'VND') {
                currency = ' dong';
                inWords = toWords(sotienN.toFixed(0)) + (objFr[currency] || currency);
            } else {
                var suffix = sotienN.toFixed(2).toString();
                suffix = suffix.split('\.');
                inWords = toWords( new Number(suffix[0])) + ' ' + (objFr[currency] || currency);

                suffix = suffix[1];
                suffix = new Number(suffix);
                if(suffix >= 1) {
                    inWords = inWords + ' and ' + toWords(suffix) + ' cents.';
                } else {
                    inWords = inWords + '.';
                }
            }
            if(sotienN.toFixed(0) == 0) {
                inWords = 'Zero ' + inWords;
            }
            inWords = inWords.substring(0, 1).toUpperCase() + inWords.substring(1);
            return inWords;
        }

        var ChuSo = new Array(" không "," một "," hai "," ba "," bốn "," năm "," sáu "," bảy "," tám "," chín ");
        var Tien = new Array( "", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ");

        // 1. HÃ m Ä‘á»�c sá»‘ cÃ³ ba chá»¯ sá»‘;
        function DocSo3ChuSo(baso, isFirst) {
            var tram;
            var chuc;
            var donvi;
            var KetQua = "";
            tram = parseInt(baso / 100);
            chuc = parseInt((baso % 100) / 10);
            donvi = baso % 10;
            if (tram == 0 && chuc == 0 && donvi == 0)
                return "";
            if (tram == 0 && (chuc != 0 || donvi != 0) && isFirst == false) {
                KetQua += ChuSo[tram] + " trăm ";
                if ((chuc == 0) && (donvi != 0))
                    KetQua = KetQua + " linh ";
            }
            if (tram != 0) {
                KetQua += ChuSo[tram] + " trăm ";
                if ((chuc == 0) && (donvi != 0))
                    KetQua += " linh ";
            }
            if ((chuc != 0) && (chuc != 1)) {
                KetQua += ChuSo[chuc] + " mươi";
                if ((chuc == 0) && (donvi != 0))
                    KetQua = KetQua + " linh ";
            }
            if (chuc == 1)
                KetQua += " mười ";
            switch (donvi) {
                case 1:
                    if ((chuc != 0) && (chuc != 1)) {
                        KetQua += " mốt ";
                    } else {
                        KetQua += ChuSo[donvi];
                    }
                    break;
                case 5:
                    if (chuc == 0) {
                        KetQua += ChuSo[donvi];
                    } else {
                        KetQua += " lăm ";
                    }
                    break;
                default:
                    if (donvi != 0) {
                        KetQua += ChuSo[donvi];
                    }
                    break;
            }
            return KetQua;
        }

        function DocChu(SoTien) {
            SoTien = Math.round(Math.round(SoTien * 10) / 10);
            var lan = 0;
            var i = 0;
            var so = 0;
            var KetQua = "";
            var tmp = "";
            var ViTri = new Array();
            if (SoTien > 0) {
                so = SoTien;
            } else {
                so = -SoTien;
            }
            ViTri[5] = Math.floor(so / 1000000000000000);
            if (isNaN(ViTri[5]))
                ViTri[5] = "0";
            so = so - parseFloat(ViTri[5].toString()) * 1000000000000000;
            ViTri[4] = Math.floor(so / 1000000000000);
            if (isNaN(ViTri[4]))
                ViTri[4] = "0";
            so = so - parseFloat(ViTri[4].toString()) * 1000000000000;
            ViTri[3] = Math.floor(so / 1000000000);
            if (isNaN(ViTri[3]))
                ViTri[3] = "0";
            so = so - parseFloat(ViTri[3].toString()) * 1000000000;
            ViTri[2] = parseInt(so / 1000000);
            if (isNaN(ViTri[2]))
                ViTri[2] = "0";
            ViTri[1] = parseInt((so % 1000000) / 1000);
            if (isNaN(ViTri[1]))
                ViTri[1] = "0";
            ViTri[0] = parseInt(so % 1000);
            if (isNaN(ViTri[0]))
                ViTri[0] = "0";
            if (ViTri[5] > 0) {
                lan = 5;
            } else if (ViTri[4] > 0) {
                lan = 4;
            } else if (ViTri[3] > 0) {
                lan = 3;
            } else if (ViTri[2] > 0) {
                lan = 2;
            } else if (ViTri[1] > 0) {
                lan = 1;
            } else {
                lan = 0;
            }

            for (i = lan; i >= 0; i--) {
                tmp = DocSo3ChuSo(ViTri[i], (i == lan));
                KetQua += tmp;
                if (ViTri[i] > 0)
                    KetQua += Tien[i];
                if ((i > 0) && (tmp.length > 0))
                    KetQua += ',';// && (!string.IsNullOrEmpty(tmp))
            }
            if (KetQua.substring(KetQua.length - 1) == ',') {
                KetQua = KetQua.substring(0, KetQua.length - 1);
            }
            return KetQua;
        }

        function DocTienBangChu(SoTien, currency) {
            if (SoTien < 0) {
                return "Số tiền âm !";
            } else if (SoTien == 0) {
                if (currency == 'VND') {
                    return "Không đồng !";
                } else {
                    return "Không " + (objVnd[currency] || currency) + " !";
                }
            }
            if (SoTien > 8999999999999999) {
                return "Số quá lớn!";
            }
            var KetQua ='', strEnd = '';
            if(currency != 'VND') {
                var sotienN = new Number(SoTien);
                var suffix = sotienN.toFixed(2).toString();
                suffix = suffix.split('\.');
                KetQua = DocChu(new Number(suffix[0]));
                suffix = suffix[1];
                suffix = new Number(suffix);
                if(suffix >= 1) {
                    KetQua = KetQua + ' ' + (objVnd[currency] || currency) + ' và' + DocChu(suffix) + ' xen./';
                } else {
                    KetQua = KetQua + ' ' + (objVnd[currency] || currency) + ' chẵn./'
                }
            } else {
                KetQua = DocChu(SoTien);
                strEnd = ' đồng chẵn./';
            }
            KetQua = KetQua.substring(1, 2).toUpperCase() + KetQua.substring(2);
            return KetQua + strEnd;
        }

        return {
            toAmountInWorld: toAmountInWorld,
            DocTienBangChu: DocTienBangChu
        };

    });
