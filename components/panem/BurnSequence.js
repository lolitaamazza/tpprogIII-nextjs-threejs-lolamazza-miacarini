'use client';
import dynamic from 'next/dynamic';
import {usePanem} from './PanemProvider';

const Burning=dynamic(()=>import('./Burning'),{ssr:false});
export default function BurnSequence(){
 const {burning}=usePanem();
 return burning?<Burning/>:null;
}
