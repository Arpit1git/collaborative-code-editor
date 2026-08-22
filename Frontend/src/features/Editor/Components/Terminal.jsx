import React, { useState } from 'react'

const Terminal = ({Output}) => {
  

  return (

    <div className='border-white text-amber-50 font-bold w-full h-full overflow-y-auto p-4 '>
      <p className='text-gray-400 mb-2'>Terminal</p>
      {
        Output && <pre className="font-mono text-green-400 whitespace-pre-wrap">{Output}</pre>
      }
    </div>
    
  )
}

export default Terminal