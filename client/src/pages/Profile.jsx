import React, { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { getDownloadURL, getStorage, ref, uploadBytesResumable, } from 'firebase/storage';
import { app } from '../firebase';
import { updateUserStart, updateUserFailure, updateUserSuccess, deleteUserFailure, deleteUserStart, deleteUserSuccess, signOutUserStart, signOutUserFailure, signOutUserSuccess } from '../redux/user/userSlice';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { createNextState } from '@reduxjs/toolkit';

export default function Profile() {
    const fileRef = useRef(null);
    const { currentUser, loading, error } = useSelector((state) => state.user)
    const [file, setFile] = useState(undefined)
    const [filePerc, setFilePerc] = useState(0);
    const [fileUploadError, setFileUploadError] = useState(false);
    const [formData, setFormData] = useState({});
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const dispatch = useDispatch();
    const [showListingsError, setShowListingsError] = useState(false);
    const [userListings, setUserListings] = useState([])

    console.log(file)
    useEffect(() => {
        if (file) {
            handleFileUpload(file);
        }
    }, [file]);

    const handleFileUpload = (file) => {
        const storage = getStorage(app);
        const fileName = new Date().getTime() + file.name;//if any one upload same file two times than we get the error so we do  new Date().getTime() + file.name instead of file.name
        const storageRef = ref(storage, fileName);
        const uploadTask = uploadBytesResumable(storageRef, file);// by this we see the percentage of the upload

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress =
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100;//percentage of upload
                setFilePerc(Math.round(progress));
            },
            (error) => {
                setFileUploadError(true);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) =>
                    setFormData({ ...formData, avatar: downloadURL })
                );
            }//get the file i.e upload the photo( getDownloadURL(uploadTask.snapshot.ref)) and id upload is sucessful we download the file or photo url and setFormData(.then((downloadURL)=>setFormData({ ...formData, avatar: downloadURL })

        );
    };
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }
    console.log(formData)

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            dispatch(updateUserStart());
            const res = await fetch(`/api/user/update/${currentUser._id}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                }
            );
            const data = await res.json();
            console.log(data)
            if (data.success === false) {
                dispatch(updateUserFailure(data.message));
                return;
            }
            dispatch(updateUserSuccess(data));
            setUpdateSuccess(true);

        } catch (error) {
            dispatch(updateUserFailure(error.message))
        }
    }

    const handleDeleteUser = async () => {
        try {
            dispatch(deleteUserStart())
            const res = await fetch(`/api/user/delete/${currentUser._id}`,
                {
                    method: 'DELETE',
                }
            );
            const data = await res.json();
            console.log(data)
            if (data.success === false) {
                dispatch(deleteUserFailure(data.message));
                return;
            }
            dispatch(deleteUserSuccess(data));
        } catch (error) {
            dispatch(deleteUserFailure(error.message));
        }
    }

    const handleSignOut = async () => {
        try {
            dispatch(signOutUserStart())
            const res = await fetch('/api/auth/signout');
            const data = await res.json();
            if (data.success === false) {
                dispatch(signOutUserFailure(data.message))
                return;
            }
            dispatch(signOutUserSuccess(data))

        } catch (error) {

        }
    }
    const handleShowListings = async () => {
        try {
            setShowListingsError(false);
            const res = await fetch(`/api/user/listings/${currentUser._id}`);//user  only see their own listings
            const data = await res.json();
            if (data.success === false) {
                setShowListingsError(true);
                return;
            }
            setUserListings(data);
        } catch (error) {
            setShowListingsError(true)
        }

    }
    const handleListingDelete=async(listingId)=>{
        try{
            const res=await fetch(`/api/listing/delete/${listingId}`,
                {
                    method:'DELETE',
                }
            );
            const data=await res.json();
            if(data.success===false){
                console.log(data.message);
                return;
            }
            setUserListings((prev)=>prev.filter((listing)=>listing._id!==listingId));


        }catch(error){
            console.log(error.message)
        }

    }
    return (
        <div className='p-3 max-w-lg mx-auto'>
            <h1 className='text-3xl font-semibold text-center my-7'>Profile</h1>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <input onChange={(e) => { setFile(e.target.files[0]) }} type='file' ref={fileRef} hidden accept='image/*' />
                <img onClick={() => fileRef.current.click()} src={formData.avatar || currentUser.avatar} alt='profile' className='rounded-full h-24 w-24 object-cover cursor-pointer self-center mt-2' />
                <p className='text-sm self-center'>
                    {fileUploadError ? (
                        <span className='text-red-700'>
                            Error Image upload (image must be less than 2 mb)
                        </span>
                    ) : filePerc > 0 && filePerc < 100 ? (
                        <span className='text-slate-700'>{`Uploading ${filePerc}%`}</span>
                    ) : filePerc === 100 ? (
                        <span className='text-green-700'>Image successfully uploaded!</span>
                    ) : (
                        ''
                    )}
                </p>

                <input type='text' placeholder='username' id='username' className='border p-3 rounded-lg' defaultValue={currentUser.username} onChange={handleChange} />
                <input type='email' placeholder='email' id='email' className='border p-3 rounded-lg' defaultValue={currentUser.email} onChange={handleChange} />
                <input type='text' placeholder='password' id='password' className='border p-3 rounded-lg' defaultValue={currentUser.password} onChange={handleChange} />
                <button disabled={loading} className='bg-slate-700 text-white rounded-lg p-3 uppercase hover:opacity-80'>{loading ? 'loading...' : 'update'}</button>
                <Link className='bg-green-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95' to={'/create-listing'}>
                    create listing
                </Link>
            </form>
            <div className='flex justify-between mt-5'>
                <span onClick={handleDeleteUser} className='text-red-700 cursor-pointer'>Delete account</span>
                <span onClick={handleSignOut} className='text-red-700 cursor-pointer'>Sign out</span>
            </div>

            <p className='text-red-700 mt-5'>{error ? error : ''}</p>
            <p className='text-green-700 mt-5'>{updateSuccess ? 'User is updated Successfully!' : ''}</p>
            <button onClick={handleShowListings} className='text-green-700 w-full'> Show Listing</button>
            <p className='text-red-700 mt-5'>{showListingsError ? 'Error showing listings' : ''}</p>
            {userListings && userListings.length > 0 && 
            <div className='flex flex-col gap-4'>
                <h1 className='text-center mt-7 text-2xl font-semibold'>Your Listings</h1>
                {userListings.map((listing) =>
                <div className='border rounded-lg p-3 flex justify-between items-center gap-4' key={listing._id}  >
                    <Link to={`/listing/${listing._id}`}>
                    <img 
                    src={listing.imageUrls[0]}
                    alt='listing cover'
                    className='h-16 w-16 object-contain'
                    />
                    </Link>
                    <Link className='text-slate-700 font-semibold hover:underline truncate flex-1' to={`/listing/${listing._id}`}>
                    <p >{listing.name}</p>
                    
                    </Link>
                    <div className='flex flex-col item-center'>
                        <button onClick={()=>handleListingDelete(listing._id)} className='text-red-700 uppercase'>Delete</button>

                        <Link to={`/update-listing/${listing._id}`}>
                        <button className='text-green-700 uppercase'>Edit</button>
                        </Link>

                    </div>




                </div>

            )}</div>}

        </div>
    )
}