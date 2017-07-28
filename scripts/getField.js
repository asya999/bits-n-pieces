/* given an object and a field name, return
 * the value of that key in that object
 * if f is a string literal that start with "$" 
 * caller must pass an object {$literal: "$foo"} 
 * rather than just "$foo"
 */
getField = function ( obj, f ) {
    return {$arrayElemAt:[ 
        {$map:{ 
            input:{$filter:{ 
                input:{$objectToArray:obj}, 
                cond:{$eq:["$$this.k", f]} 
            }}, 
            in:"$$this.v" 
        }}, 
        0 
    ]} 
}
