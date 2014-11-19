function (shapes) {
      print(shapes.length + " shapes");
      var i = 0;
      shapes.forEach(function(sh) {
           print(""+ i + "******************************************************************************");
           print(tojsononeline(sh));
           var plans = pc.getPlansByQuery(sh);
           plans.forEach(function(pl) {
                print(""+ i + "******************************************************************************");
                print(tojsononeline(sh));
                print(""+ i + "******************************************************************************");
                print("------------------------------------------------------------------------------");
                printjson(pl);
                print("------------------------------------------------------------------------------");
           });
           i++;
      })
      print(shapes.length + " shapes");
}
