// const asyncHandler = (fn) => async (req, res, next) => {
//     try{
//         await fn(req, res, next)
//     }catch(error){
//         res.status(error.status || 500).json({
//             successful
//         })
//     }
// }

const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req,res,next)).catch((err) => next(err))
}

export {asyncHandler}